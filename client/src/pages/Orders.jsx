import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import WishlistButton from '../components/WishlistButton';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import '../styles/orders.css';

const dateLocales = { en: 'en-IN', hi: 'hi-IN', or: 'or-IN', te: 'te-IN', ta: 'ta-IN', pa: 'pa-IN', bn: 'bn-IN' };
const formatDate = (date, language) => new Date(date).toLocaleString(dateLocales[language] || 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});

const Orders = () => {
    const { user } = useContext(AuthContext);
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exchangeReasons, setExchangeReasons] = useState({});
    const [exchangeMessages, setExchangeMessages] = useState({});
    const [exchangeSubmittingId, setExchangeSubmittingId] = useState('');

    useEffect(() => {
        if (!user?.token) {
            navigate('/login');
            return;
        }

        const fetchOrders = async () => {
            try {
                const response = await apiFetch('/api/orders/myorders', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Could not load your orders.');
                }
                setOrders(data);
            } catch (fetchError) {
                console.error('Could not load orders:', fetchError);
                setError(fetchError.message || 'Could not load your orders. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [user, navigate]);

    const submitExchangeRequest = async (event, orderId) => {
        event.preventDefault();
        setExchangeSubmittingId(orderId);
        setExchangeMessages((current) => ({ ...current, [orderId]: null }));
        try {
            const response = await apiFetch(`/api/orders/${orderId}/exchange-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify({ reason: exchangeReasons[orderId] || '' })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not submit your exchange request.');
            setOrders((current) => current.map((order) => order._id === orderId ? data.order : order));
            setExchangeMessages((current) => ({ ...current, [orderId]: { text: data.message, isError: false } }));
            setExchangeReasons((current) => ({ ...current, [orderId]: '' }));
        } catch (requestError) {
            setExchangeMessages((current) => ({
                ...current,
                [orderId]: { text: requestError.message, isError: true }
            }));
        } finally {
            setExchangeSubmittingId('');
        }
    };

    return (
        <main className="orders-page">
            <header className="orders-heading">
                <span>{t('yourAccount')}</span>
                <h1>{t('myOrders')}</h1>
                <p>{t('viewPurchases')}</p>
            </header>

            {loading && <p role="status">{t('loadingOrders')}</p>}
            {error && <p className="orders-error" role="alert">{error}</p>}
            {!loading && !error && orders.length === 0 && (
                <section className="orders-empty">
                    <h2>{t('noOrders')}</h2>
                    <p>{t('ordersAppear')}</p>
                    <Link className="btn" to="/shop">{t('browseProducts')}</Link>
                </section>
            )}

            <div className="orders-list">
                {orders.map((order) => (
                    (() => {
                        const statusIndex = { pending: 0, processing: 1, shipped: 2, in_transit: 3, out_for_delivery: 4, delivered: 5 }[order.status] ?? 0;
                        const exchangeDeadline = order.deliveredAt
                            ? new Date(new Date(order.deliveredAt).getTime() + 10 * 24 * 60 * 60 * 1000)
                            : null;
                        const exchangeOpen = Boolean(order.isPaid && order.isDelivered && exchangeDeadline && Date.now() <= exchangeDeadline.getTime());
                        const timeline = [
                            { label: t('paid'), date: order.paidAt },
                            { label: t('packaging'), date: order.processingAt },
                            { label: t('shipped'), date: order.shippedAt },
                            { label: 'On the way', date: order.inTransitAt },
                            { label: 'Out for delivery', date: order.outForDeliveryAt },
                            { label: t('delivered'), date: order.deliveredAt }
                        ];
                        return (
                    <article className="order-card" key={order._id}>
                        <div className="order-card-header">
                            <div>
                                <span className="order-label">{t('myOrders')}</span>
                                <h2>#{order._id}</h2>
                                <p>{t('placed')} {formatDate(order.createdAt, language)}</p>
                            </div>
                            <div className="order-statuses">
                                <span className={`order-status ${order.isPaid ? 'is-paid' : 'is-unpaid'}`}>
                                    {order.isPaid ? t('paid') : t('paymentPending')}
                                </span>
                                <span className="order-status">
                                    {{ pending: t('paymentPending'), processing: t('packaging'), shipped: t('shipped'), in_transit: 'On the way', out_for_delivery: 'Out for delivery', delivered: t('delivered') }[order.status] || order.status}
                                </span>
                            </div>
                        </div>

                        {order.isPaid ? (
                        <section className="order-tracking" aria-label={t('deliveryTracking')}>
                            <div className="order-tracking-heading">
                                <div>
                                    <span className="order-label">{t('deliveryTracking')}</span>
                                    <h3>{t('orderJourney')}</h3>
                                </div>
                                <span className="tracking-current">
                                    {{ pending: t('paymentPending'), processing: t('packaging'), shipped: t('shipped'), in_transit: 'On the way', out_for_delivery: 'Out for delivery', delivered: t('delivered') }[order.status] || t('paymentPending')}
                                </span>
                            </div>
                            <ol className="order-timeline">
                                {timeline.map((step, index) => {
                                    const complete = order.isPaid && statusIndex >= index;
                                    const current = complete && statusIndex === index && order.status !== 'delivered';
                                    return (
                                        <li className={`order-timeline-step${complete ? ' is-complete' : ''}${current ? ' is-current' : ''}`} key={step.label}>
                                            <span className="timeline-marker" aria-hidden="true">{complete ? '✓' : index + 1}</span>
                                            <span className="timeline-label">{step.label}</span>
                                            <span className="timeline-date">
                                                {step.date ? formatDate(step.date, language) : complete ? t('dateNotRecorded') : t('awaitingUpdate')}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ol>
                        </section>
                        ) : (
                            <section className="order-awaiting-payment" role="status">
                                <span className="order-label">{t('paymentRequired')}</span>
                                <p>{t('trackingAfterPayment')}</p>
                            </section>
                        )}

                        <div className="order-detail-grid">
                            <section>
                                <h3>{t('items')}</h3>
                                <ul className="ordered-products">
                                    {order.orderItems.map((item, index) => (
                                        <li key={`${item.product?._id || item.product || item.name}-${index}`}>
                                            <img
                                                className="ordered-product-image"
                                                src={item.product?.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%2327272a'/%3E%3C/svg%3E"}
                                                alt={item.name}
                                                onError={(event) => {
                                                    event.currentTarget.onerror = null;
                                                    event.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%2327272a'/%3E%3C/svg%3E";
                                                }}
                                            />
                                            <span>{item.name}</span>
                                            {item.product?._id && Number(item.product.rating) > 0 && (
                                                <span className="ordered-product-rating">★ {Number(item.product.rating).toFixed(1)} ({Number(item.product.numReviews || 0)})</span>
                                            )}
                                            {item.product?._id && <WishlistButton product={item.product} compact />}
                                            {order.status === 'delivered' && item.product?._id && (
                                                <Link className="order-review-link" to={`/products/${item.product._id}#product-reviews`}>Rate & review</Link>
                                            )}
                                            <strong>₹{(item.price * item.qty).toFixed(2)}</strong>
                                        </li>
                                    ))}
                                </ul>
                                <div className="order-price-breakdown">
                                    <div><span>{t('itemsSubtotal')}</span><strong>₹{Number(order.itemsPrice || 0).toFixed(2)}</strong></div>
                                    <div><span>{t('tax')}</span><strong>₹{Number(order.taxPrice || 0).toFixed(2)}</strong></div>
                                    {Number(order.promiseFee) > 0 && <div><span>{t('promiseFee')}</span><strong>₹{Number(order.promiseFee).toFixed(2)}</strong></div>}
                                    <div><span>{t('deliveryFee')}</span><strong>₹{Number(order.shippingPrice || 0).toFixed(2)}</strong></div>
                                    <div className="order-total-row"><span>{t('total')}</span><strong>₹{Number(order.totalPrice).toFixed(2)}</strong></div>
                                </div>
                            </section>

                            <section className="order-shipping">
                                <h3>{t('deliveryAddress')}</h3>
                                <p>{order.shippingAddress.fullName}</p>
                                <p>{order.shippingAddress.phone}</p>
                                {order.shippingAddress.altPhone && <p>{t('alternative')}: {order.shippingAddress.altPhone}</p>}
                                <p>{order.shippingAddress.address}</p>
                                <p>{order.shippingAddress.district || order.shippingAddress.city}, {order.shippingAddress.state || ''} {order.shippingAddress.postalCode}</p>
                                <p>{order.shippingAddress.country}</p>
                            </section>
                        </div>

                        {order.isDelivered && <section className="exchange-panel" aria-label="Exchange request">
                            <div>
                                <span className="order-label">{t('exchangeWindow')}</span>
                                <h3>{t('needExchange')}</h3>
                                {order.exchangeRequest?.status ? (
                                    <div className={`exchange-state exchange-${order.exchangeRequest.status}`}>
                                        <strong>{t('exchangeRequested')}: {t(order.exchangeRequest.status)}</strong>
                                        {order.exchangeRequest.requestedAt && <span>{t('requested')} {formatDate(order.exchangeRequest.requestedAt, language)}</span>}
                                        {order.exchangeRequest.reason && <p>{order.exchangeRequest.reason}</p>}
                                    </div>
                                ) : order.isDelivered && exchangeDeadline ? (
                                    <p className="exchange-deadline">
                                        {exchangeOpen
                                                ? `${t('requestBy')} ${formatDate(exchangeDeadline, language)}.`
                                                : `${t('exchangeWindowEnded')} ${formatDate(exchangeDeadline, language)}.`}
                                    </p>
                                ) : (
                                            <p className="exchange-deadline">{t('exchangeOpensAfterDelivery')}</p>
                                )}
                            </div>
                            {exchangeOpen && !order.exchangeRequest?.status && (
                                <form className="exchange-form" onSubmit={(event) => submitExchangeRequest(event, order._id)}>
                                    <label htmlFor={`exchange-reason-${order._id}`}>{t('reasonExchange')}</label>
                                    <textarea
                                        id={`exchange-reason-${order._id}`}
                                        value={exchangeReasons[order._id] || ''}
                                        onChange={(event) => setExchangeReasons((current) => ({ ...current, [order._id]: event.target.value }))}
                                        minLength={5}
                                        maxLength={500}
                                        placeholder={t('tellReason')}
                                        required
                                    />
                                    <button className="exchange-submit" type="submit" disabled={exchangeSubmittingId === order._id}>
                                        {exchangeSubmittingId === order._id ? t('submitting') : t('requestExchange')}
                                    </button>
                                </form>
                            )}
                            {exchangeMessages[order._id] && (
                                <p className={exchangeMessages[order._id].isError ? 'exchange-feedback is-error' : 'exchange-feedback'} role={exchangeMessages[order._id].isError ? 'alert' : 'status'}>
                                    {exchangeMessages[order._id].text}
                                </p>
                            )}
                        </section>}

                        <footer className="order-card-footer">
                            <span>{t('payment')}: {order.paymentMethod}</span>
                            {order.isPaid && order.paidAt && <span>{t('paid')} {formatDate(order.paidAt, language)}</span>}
                            {order.isDelivered && order.deliveredAt && <span>{t('delivered')} {formatDate(order.deliveredAt, language)}</span>}
                        </footer>
                    </article>
                        );
                    })()
                ))}
            </div>
        </main>
    );
};

export default Orders;
