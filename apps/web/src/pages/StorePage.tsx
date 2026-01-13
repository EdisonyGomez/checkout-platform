import { useEffect, useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import ProductCard from '../components/ProductCard';
import PaymentDetailsModal from '../components/PaymentDetailsModal';
import OrderSummaryModal from '../components/OrderSummaryModal';
import PaymentResultModal from '../components/PaymentResultModal';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { loadProducts } from '../features/products/productsSlice';
import { initThunk, payThunk, pollStatusThunk, setDraft, setUi, resetAll, syncThunk } from '../features/checkout/checkoutSlice';
import LoadingOverlay from '../components/LoadingOverlay';

function uuid() {
    return crypto.randomUUID();
}

export default function StorePage() {
    const dispatch = useAppDispatch();
    const products = useAppSelector((s) => s.products);
    const checkout = useAppSelector((s) => s.checkout);

    const [selectedProductId, setSelectedProductId] = useState<string>('');

    // Fees (como en screenshots)
    const feeBaseCents = 5000;
    const feeDeliveryCents = 12000;

    const [pollSeconds, setPollSeconds] = useState(0);
    const [autoSyncInFlight, setAutoSyncInFlight] = useState(false);
    const [lastAutoSyncAt, setLastAutoSyncAt] = useState<number>(0);


    useEffect(() => {
        dispatch(loadProducts());
    }, [dispatch]);

    useEffect(() => {
        if (!selectedProductId && products.items.length > 0) {
            setSelectedProductId(products.items[0].id);
        }
    }, [products.items, selectedProductId]);

    const selected = useMemo(
        () => products.items.find((p) => p.id === selectedProductId) ?? null,
        [products.items, selectedProductId],
    );

    const totalCents = (selected?.price_cents ?? 0) + feeBaseCents + feeDeliveryCents;

    // Polling: si step está POLLING, consulta cada 2s
    useEffect(() => {
        const publicNumber = checkout.init?.public_number;
        if (!publicNumber) return;

        // Cuando no estamos en polling, reseteamos contadores
        if (checkout.step !== 'POLLING') {
            setPollSeconds(0);
            setAutoSyncInFlight(false);
            setLastAutoSyncAt(0);
            return;
        }

        // Arranca contador
        setPollSeconds(0);

        const interval = setInterval(async () => {
            // 1) Poll status
            await dispatch(pollStatusThunk(publicNumber));

            // 2) Incremento de tiempo
            setPollSeconds((s) => s + 2);
        }, 2000);

        return () => clearInterval(interval);
    }, [dispatch, checkout.step, checkout.init?.public_number]);

    useEffect(() => {
        const publicNumber = checkout.init?.public_number;
        if (!publicNumber) return;

        // Solo auto-sync durante polling
        if (checkout.step !== 'POLLING') return;

        // Solo si status actual es PENDING
        if (checkout.status?.found === true && checkout.status.status !== 'PENDING') return;

        // Si aún no hay status (primera vuelta), espera
        if (!checkout.status) return;

        // Esperar mínimo 8s antes del primer auto-sync
        if (pollSeconds < 8) return;

        // Backoff: no hacer sync demasiado seguido (cada 10s)
        const now = Date.now();
        const minGapMs = 10_000;

        if (autoSyncInFlight) return;
        if (lastAutoSyncAt && now - lastAutoSyncAt < minGapMs) return;

        // Evitar loops eternos: máximo 60s intentando
        if (pollSeconds > 60) return;

        (async () => {
            try {
                setAutoSyncInFlight(true);
                setLastAutoSyncAt(Date.now());

                await dispatch(syncThunk(publicNumber));
                // luego de sync, vuelve a consultar status para reflejar cambio inmediatamente
                await dispatch(pollStatusThunk(publicNumber));
            } finally {
                setAutoSyncInFlight(false);
            }
        })();
    }, [
        dispatch,
        checkout.init?.public_number,
        checkout.step,
        checkout.status,
        pollSeconds,
        autoSyncInFlight,
        lastAutoSyncAt,
    ]);

    function openPayment(productId: string) {
        setSelectedProductId(productId);
        dispatch(resetAll());
        dispatch(setUi({ paymentModalOpen: true }));
    }

    function validateDraft() {
        const d = checkout.draft;
        const n = d.card_number.replace(/\D+/g, '');
        if (!/^\d{13,19}$/.test(n)) return 'Invalid card number';
        if (!/^\d{3,4}$/.test(d.card_cvc)) return 'Invalid CVC';
        if (d.card_exp_month.trim().length < 2) return 'Invalid month';
        if (d.card_exp_year.trim().length < 2) return 'Invalid year';
        if (!d.card_holder.trim()) return 'Cardholder name required';
        if (!d.address_line.trim() || !d.city.trim() || !d.state.trim()) return 'Delivery address required';
        return null;
    }

    async function continueToSummary() {
        const err = validateDraft();
        if (err) {
            alert(err);
            return;
        }
        dispatch(setUi({ paymentModalOpen: false, summaryModalOpen: true }));
    }

    async function confirmPay() {
        if (!selected) return;

        // 1) init
        const idempotencyKey = uuid();
        const init = await dispatch(
            initThunk({
                idempotencyKey,
                input: {
                    product_id: selected.id,
                    customer: {
                        full_name: checkout.draft.full_name || 'Customer',
                        email: checkout.draft.email || 'test@test.com',
                        phone: checkout.draft.phone || '3000000000',
                    },
                    delivery: {
                        address_line: checkout.draft.address_line,
                        city: checkout.draft.city,
                        state: checkout.draft.state,
                        postal_code: checkout.draft.postal_code,
                    },
                },
            }),
        ).unwrap();

        if (init.status !== 'PENDING') {
            dispatch(setUi({ summaryModalOpen: false }));
            alert(`Init status: ${init.status}`);
            return;
        }

        // 2) pay
        await dispatch(
            payThunk({
                transaction_id: init.transaction_id,
                card_number: checkout.draft.card_number.replace(/\D+/g, ''),
                card_cvc: checkout.draft.card_cvc,
                card_exp_month: checkout.draft.card_exp_month,
                card_exp_year: checkout.draft.card_exp_year,
                card_holder: checkout.draft.card_holder,
                installments: checkout.draft.installments,
            }) as any,
        );

        // 3) polling
        dispatch(setUi({ summaryModalOpen: false }));
    }

    async function syncNow() {
        if (!checkout.init?.public_number) return;
        await dispatch(syncThunk(checkout.init.public_number));
        dispatch(pollStatusThunk(checkout.init.public_number));
    }

    const finalStatus =
        checkout.status?.found === true ? checkout.status.status : 'PENDING';

    const resultOpen = checkout.ui.resultModalOpen && checkout.step === 'DONE';

    const providerTxId =
        checkout.status?.found === true && checkout.status.wompi_transaction_id
            ? checkout.status.wompi_transaction_id
            : checkout.init?.transaction_id ?? '-';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <TopBar />

            <main className="flex-1 mx-auto w-full  px-4 py-8 ">
                <section className="mx-auto max-w-6xl px-4 py-8">

                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center border border-green-200">
                            <span className="text-green-700 font-bold">🛍</span>
                        </div>
                        <div>
                            <div className="text-2xl font-extrabold text-slate-900">Available Products</div>
                            <div className="text-sm text-slate-500">{products.items.length} products available</div>
                        </div>
                    </div>

                    {products.loading && (
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 justify-items-stretch">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                                    <div className="aspect-16/10 bg-slate-100 animate-pulse" />
                                    <div className="p-5 space-y-3">
                                        <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
                                        <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                                        <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
                                        <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse mt-2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {products.error && <div className="mt-6 text-sm text-red-600">{products.error}</div>}

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4  justify-items-stretch gap-6">
                        {products.items.map((p) => (
                            <ProductCard key={p.id} product={p} onPay={() => openPayment(p.id)} />
                        ))}
                    </div>
                </section>
            </main>

            <PaymentDetailsModal
                open={checkout.ui.paymentModalOpen}
                product={selected}
                draft={checkout.draft}
                onChange={(patch) => dispatch(setDraft(patch))}
                onClose={() => dispatch(setUi({ paymentModalOpen: false }))}
                onContinue={continueToSummary}
            />

            <OrderSummaryModal
                open={checkout.ui.summaryModalOpen}
                product={selected}
                draft={checkout.draft}
                feeBaseCents={feeBaseCents}
                feeDeliveryCents={feeDeliveryCents}
                totalCents={totalCents}
                onBack={() => dispatch(setUi({ summaryModalOpen: false, paymentModalOpen: true }))}
                onClose={() => dispatch(setUi({ summaryModalOpen: false }))}
                onConfirmPay={confirmPay}

            />

            {/* Si se queda PENDING por localhost: botón Sync (no en screenshot pero necesario) */}
            {checkout.step === 'POLLING' && finalStatus === 'PENDING' && checkout.init?.public_number && (
                <div className="fixed bottom-6 right-6 z-40">
                    <button
                        onClick={syncNow}
                        className="h-11 rounded-xl bg-white border border-slate-200 shadow-lg px-4 text-sm font-semibold hover:bg-slate-50"
                    >
                        Sync status
                    </button>
                </div>
            )}

            <PaymentResultModal
                open={resultOpen}
                status={finalStatus === 'APPROVED' ? 'APPROVED' : finalStatus === 'DECLINED' ? 'DECLINED' : 'ERROR'}
                productName={selected?.name ?? 'Product'}
                amountTotalCents={checkout.init?.amount_total_cents ?? totalCents}
                reference={checkout.init?.public_number ?? '-'}
                providerTxId={providerTxId}
                onBack={() => {
                    dispatch(resetAll());
                    dispatch(loadProducts());
                }}
            />

            <LoadingOverlay
                show={checkout.loading || checkout.step === 'PAYING' || (checkout.step === 'POLLING' && (checkout.status?.found !== true || checkout.status.status === 'PENDING'))}
                title={
                    checkout.step === 'POLLING'
                        ? 'Confirming payment…'
                        : 'Processing payment…'
                }
                subtitle={
                    checkout.step === 'POLLING'
                        ? 'Waiting for provider confirmation (webhook/polling).'
                        : 'Creating transaction and sending card details to the provider.'
                }
            />


        </div>
    );
}
