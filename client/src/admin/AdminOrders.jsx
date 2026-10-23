import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import '../styles/orders.css';

const orderStatuses = ['pending', 'processing', 'shipped'];

const AdminOrders = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [updatingId, setUpdatingId] = useState('');
    const [paymentReferences, setPaymentReferences] = useState({});

    const fetchOrders = useCallback(async () => {
        if (!user?.token || user.role !== 'admin') {
            return;
        }
        setError('');
        try {
            const response = await apiFetch('/api/orders', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Could not load orders.');
            }
            setOrders(data);
        } catch (fetchError) {
            console.error('Could not load admin orders:', fetchError);
            setError(fetchError.message || 'Could not load orders.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user?.token) {
            navigate('/login');
            return;
        }
        if (user.role !== 'admin') {
            setLoading(false);
            return;
        }
        fetchOrders();
    }, [user, navigate, fetchOrders]);

    const updateStatus = async (orderId, status) => {
        setUpdatingId(orderId);
        setError('');
        try {
            const response = await apiFetch(`/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify({ status })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Could not update order status.');
            }
            setOrders((currentOrders) => currentOrders.map((order) => (
                order._id === orderId ? data.order : order
            )));
        } catch (updateError) {
            console.error('Could not update order status:', updateError);
            setError(updateError.message || 'Could not update order status.');
            await fetchOrders();
        } finally {
            setUpdatingId('');
        }
    };

    const markDelivered = (orderId) => {
        if (window.confirm('Confirm that this order has been delivered to the customer?')) {
            updateStatus(orderId, 'delivered');
        }
    };

    const reviewExchange = async (orderId, status) => {
        setUpdatingId(orderId);
        setError('');
        try {
            const response = await apiFetch(`/api/orders/${orderId}/exchange-request`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify({ status })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Could not update the exchange request.');
            setOrders((currentOrders) => currentOrders.map((order) => (
                order._id === orderId ? data.order : order
            )));
        } catch (reviewError) {
            setError(reviewError.message || 'Could not update the exchange request.');
            await fetchOrders();
        } finally {
            setUpdatingId('');
        }
    };

    const confirmPayment = async (orderId) => {
        const reference = paymentReferences[orderId]?.trim() || '';
        if (reference.length < 4 || reference.length > 120) {
            setError('Enter a payment reference between 4 and 120 characters.');
            return;
        }

        setUpdatingId(orderId);
        setError('');
        try {
            const response = await apiFetch(`/api/orders/${orderId}/payment-confirmation`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user.token}`
                },
                body: JSON.stringify({ reference })
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Could not confirm payment.');
            }
            setOrders((currentOrders) => currentOrders.map((order) => (
                order._id === orderId ? data.order : order
            )));
            setPaymentReferences((currentReferences) => {
                const nextReferences = { ...currentReferences };
                delete nextReferences[orderId];
                return nextReferences;
            });
        } catch (confirmationError) {
            console.error('Could not confirm order payment:', confirmationError);
            setError(confirmationError.message || 'Could not confirm payment.');
            await fetchOrders();
        } finally {
            setUpdatingId('');
        }
    };

    if (user?.role !== 'admin') {
        return (
            <main className="orders-page">
                <section className="orders-empty">
                    <h2>Admin access required</h2>
                    <p>Sign in with an administrator account to manage orders.</p>
                    <Link className="btn" to="/login">Go to login</Link>
                </section>
            </main>
        );
    }

    return (
        <main className="orders-page">
            <header className="orders-heading">
                <span>ADMINISTRATION</span>
                <h1>Manage orders</h1>
                <p>Verify payments, then approve and record delivery for paid orders.</p>
            </header>

            {error && <p className="orders-error" role="alert">{error}</p>}
            {loading && <p role="status">Loading orders...</p>}
            {!loading && !error && orders.length === 0 && (
                <section className="orders-empty">
                    <h2>No orders yet</h2>
                    <p>Customer orders will appear here.</p>
                </section>
            )}

            <div className="orders-list">
                {orders.map((order) => (
                    <article className="order-card" key={order._id}>
                        <div className="order-card-header">
                            <div>
                                <span className="order-label">ORDER</span>
                                <h2>#{order._id}</h2>
                                <p>{order.user?.name || 'Customer'} · {order.user?.email || 'No email'} · {new Date(order.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="order-statuses">
                                <span className={`order-status ${order.isPaid ? 'is-paid' : 'is-unpaid'}`}>
                                    {order.paymentConfirmation === 'razorpay'
                                        ? 'Razorpay payment verified'
                                        : order.paymentConfirmation === 'admin'
                                            ? 'Admin-confirmed payment'
                                            : order.isPaid
                                                ? 'Paid'
                                                : 'Payment not confirmed'}
                                </span>
                                <span className="order-status">{order.status}</span>
                            </div>
                        </div>

                        <div className="order-detail-grid">
                            <section>
                                <h3>Items</h3>
                                <ul className="ordered-products">
                                    {order.orderItems.map((item, index) => (
                                        <li key={`${item.product?._id || item.product || item.name}-${index}`}>
                                            <img
                                                className="ordered-product-image"
                                                src={item.product?.imageUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%2327272a'/%3E%3C/svg%3E"}
                                                alt={item.name}
                                            />
                                            <span>{item.name} × {item.qty}</span>
                                            <strong>₹{(item.price * item.qty).toFixed(2)}</strong>
                                        </li>
                                    ))}
                                </ul>
                                <div className="order-price-breakdown">
                                    <div><span>Items subtotal</span><strong>₹{Number(order.itemsPrice || 0).toFixed(2)}</strong></div>
                                    <div><span>Tax</span><strong>₹{Number(order.taxPrice || 0).toFixed(2)}</strong></div>
                                    {Number(order.promiseFee) > 0 && <div><span>Promise fee</span><strong>₹{Number(order.promiseFee).toFixed(2)}</strong></div>}
                                    <div><span>Delivery fee</span><strong>₹{Number(order.shippingPrice || 0).toFixed(2)}</strong></div>
                                    <div className="order-total-row"><span>Total</span><strong>₹{Number(order.totalPrice).toFixed(2)}</strong></div>
                                </div>
                                {order.isPaid && order.paymentResult?.razorpayPaymentId && (
                                    <p className="admin-payment-reference">Razorpay payment ID: {order.paymentResult.razorpayPaymentId}</p>
                                )}
                                {order.paymentConfirmation === 'admin' && order.manualPaymentReference && (
                                    <p className="admin-payment-reference">Admin-checked payment reference: {order.manualPaymentReference}</p>
                                )}
                                {order.paymentConfirmation === 'admin' && order.paymentConfirmedBy && (
                                    <p className="admin-payment-reference">
                                        Checked by {order.paymentConfirmedBy.name || order.paymentConfirmedBy.email}
                                    </p>
                                )}
                                {!order.isPaid && (
                                    <form
                                        className="admin-payment-confirmation"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            confirmPayment(order._id);
                                        }}
                                    >
                                        <label htmlFor={`payment-reference-${order._id}`}>
                                            Payment reference (confirm only after checking your payment provider)
                                        </label>
                                        <div>
                                            <input
                                                id={`payment-reference-${order._id}`}
                                                type="text"
                                                minLength={4}
                                                maxLength={120}
                                                value={paymentReferences[order._id] || ''}
                                                onChange={(event) => setPaymentReferences((current) => ({
                                                    ...current,
                                                    [order._id]: event.target.value
                                                }))}
                                                required
                                            />
                                            <button
                                                className="btn"
                                                type="submit"
                                                disabled={updatingId === order._id || (paymentReferences[order._id] || '').trim().length < 4}
                                            >
                                                {updatingId === order._id ? 'Confirming...' : 'Confirm payment'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </section>

                            <section className="order-shipping">
                                <h3>Delivery address</h3>
                                <p>{order.shippingAddress.fullName}</p>
                                <p>{order.shippingAddress.phone}</p>
                                {order.shippingAddress.altPhone && <p>Alternative: {order.shippingAddress.altPhone}</p>}
                                <p>{order.shippingAddress.address}</p>
                                <p>{order.shippingAddress.district || order.shippingAddress.city}, {order.shippingAddress.state || ''} {order.shippingAddress.postalCode}</p>
                                <p>{order.shippingAddress.country}</p>
                            </section>
                        </div>

                        {order.exchangeRequest?.status && (
                            <section className="admin-exchange-review">
                                <div>
                                    <h3>Exchange request: {order.exchangeRequest.status}</h3>
                                    <p>{order.exchangeRequest.reason}</p>
                                    {order.exchangeRequest.requestedAt && <span>Requested {new Date(order.exchangeRequest.requestedAt).toLocaleString()}</span>}
                                </div>
                                {order.exchangeRequest.status === 'requested' && (
                                    <div className="admin-exchange-actions">
                                        <button type="button" className="exchange-submit" disabled={updatingId === order._id} onClick={() => reviewExchange(order._id, 'approved')}>
                                            Approve exchange
                                        </button>
                                        <button type="button" className="exchange-reject" disabled={updatingId === order._id} onClick={() => reviewExchange(order._id, 'rejected')}>
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </section>
                        )}

                        <footer className="order-card-footer admin-order-footer">
                            <span>Payment: {order.paymentMethod}</span>
                            {order.isPaid && order.paidAt && <span>Paid {new Date(order.paidAt).toLocaleString()}</span>}
                            {order.isDelivered && order.deliveredAt && (
                                <span>Delivered {new Date(order.deliveredAt).toLocaleString()}</span>
                            )}
                            <label className="admin-status-control">
                                <span>Fulfillment status</span>
                                <select
                                    value={order.status}
                                    disabled={updatingId === order._id || (!order.isPaid && order.status !== 'pending')}
                                    onChange={(event) => updateStatus(order._id, event.target.value)}
                                >
                                    {orderStatuses.map((status) => (
                                        <option key={status} value={status} disabled={!order.isPaid && status !== 'pending'}>
                                            {status}
                                        </option>
                                    ))}
                                    {order.status === 'delivered' && <option value="delivered">delivered</option>}
                                </select>
                            </label>
                            {!order.isDelivered && (
                                <button
                                    type="button"
                                    className="btn admin-delivery-button"
                                    disabled={!order.isPaid || updatingId === order._id}
                                    onClick={() => markDelivered(order._id)}
                                    title={!order.isPaid ? 'Confirm payment before approving delivery.' : 'Record this order as delivered.'}
                                >
                                    {updatingId === order._id ? 'Updating...' : 'Mark as delivered'}
                                </button>
                            )}
                        </footer>
                    </article>
                ))}
            </div>
        </main>
    );
};

export default AdminOrders;
