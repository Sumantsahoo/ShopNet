import React, { useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { clearCart } from '../redux/cartSlice';
import { DISTRICTS_BY_STATE, INDIAN_STATES_AND_UTS, lookupIndiaPin } from '../utils/indiaAddress';
import { useLanguage } from '../context/LanguageContext';
import '../styles/checkout.css';

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const Checkout = () => {
  const { user } = useContext(AuthContext);
  const cartItems = useSelector((state) => state.cart.cartItems);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [address, setAddress] = useState({
    fullName: '', phone: user?.phone || '', altPhone: '', street: '', city: '', district: '', state: '', postalCode: '', country: 'India'
  });
  const [stage, setStage] = useState('details');
  const [otp, setOtp] = useState('');
  const [pendingOrderId, setPendingOrderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIsError, setMessageIsError] = useState(false);
  const [pinLookup, setPinLookup] = useState({ loading: false, message: '', isError: false });

  useEffect(() => {
    if (!/^\d{6}$/.test(address.postalCode)) {
      setPinLookup({ loading: false, message: '', isError: false });
      return undefined;
    }

    let cancelled = false;
    const lookupPin = async () => {
      setPinLookup({ loading: true, message: t('lookingUpPin'), isError: false });
      try {
        const pinAddress = await lookupIndiaPin(address.postalCode);
        if (cancelled) return;

        setAddress((current) => ({
          ...current,
          ...pinAddress,
          city: pinAddress.district
        }));
        setPinLookup({ loading: false, message: `${pinAddress.district}, ${pinAddress.state}.`, isError: false });
      } catch (error) {
        if (!cancelled) {
          setPinLookup({ loading: false, message: error.message || 'Could not look up this PIN code.', isError: true });
        }
      }
    };

    lookupPin();
    return () => { cancelled = true; };
  }, [address.postalCode, t]);

  useEffect(() => {
    if (!user?.token) return undefined;
    let cancelled = false;

    const loadSavedAddress = async () => {
      try {
        const response = await fetch('/api/authorite/profile', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        if (!response.ok) return;
        const profile = await response.json();
        if (cancelled || !profile.defaultAddress) return;

        setAddress((current) => ({
          ...current,
          fullName: profile.defaultAddress.fullName || user.name || '',
          phone: profile.defaultAddress.phone || user.phone || '',
          altPhone: profile.defaultAddress.altPhone || '',
          street: profile.defaultAddress.street || '',
          district: profile.defaultAddress.district || '',
          city: profile.defaultAddress.district || '',
          state: profile.defaultAddress.state || '',
          postalCode: profile.defaultAddress.postalCode || '',
          country: 'India'
        }));
      } catch (error) {
        console.error('Could not load saved address:', error);
      }
    };

    loadSavedAddress();
    return () => { cancelled = true; };
  }, [user?.name, user?.phone, user?.token]);

  const itemsPrice = cartItems.reduce((total, item) => total + Number(item.price) * Number(item.qty), 0);
  const taxPrice = Math.round(itemsPrice * 0.005 * 100) / 100;
  const promiseFee = 5;
  const shippingPrice = 9;
  const totalPrice = Math.round((itemsPrice + taxPrice + promiseFee + shippingPrice) * 100) / 100;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${user?.token}`
  };

  const showMessage = (text, isError = false) => {
    setMessage(text);
    setMessageIsError(isError);
  };

  const startPayment = async (orderId) => {
    const scriptLoaded = await loadRazorpay();
    if (!scriptLoaded) {
      showMessage('Your order is saved, but the payment window could not load. Check your connection and retry payment.', true);
      setStage('payment');
      return;
    }

    const paymentOrderResponse = await fetch('/api/payment/order', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ orderId })
    });
    const paymentOrder = await paymentOrderResponse.json();
    if (!paymentOrderResponse.ok) {
      showMessage(paymentOrder.message || 'Your order is saved, but payment could not be started. Check Razorpay settings and retry.', true);
      setPendingOrderId(orderId);
      setStage('payment');
      return;
    }

    const razorpay = new window.Razorpay({
      key: paymentOrder.keyId,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      name: 'ShopNest',
      description: 'Order payment',
      order_id: paymentOrder.razorpayOrderId,
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true
      },
      prefill: {
        name: address.fullName,
        email: user?.email,
        contact: address.phone
      },
      theme: { color: '#f97316' },
      handler: async (paymentDetails) => {
        try {
          const verificationResponse = await fetch('/api/payment/payment', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(paymentDetails)
          });
          const verification = await verificationResponse.json();
          if (!verificationResponse.ok) {
            showMessage(verification.message || 'Payment verification failed. Contact support before retrying payment.', true);
            return;
          }
          dispatch(clearCart());
          setStage('complete');
        } catch (error) {
          console.error('Payment verification request failed:', error);
          showMessage('Payment was submitted, but confirmation could not be checked. Please contact support before trying again.', true);
        }
      },
      modal: {
        ondismiss: () => showMessage('Payment was not completed. Your order is saved; you can retry payment below.', true)
      }
    });

    setPendingOrderId(orderId);
    setStage('payment');
    razorpay.open();
  };

  const handleRequestOtp = async () => {
    if (!user?.token) {
      navigate('/login');
      return;
    }
    if (cartItems.length === 0) {
      showMessage('Your cart is empty. Add products before checking out.', true);
      return;
    }

    setIsSubmitting(true);
    showMessage('');
    try {
      const response = await fetch('/api/orders/request-otp', {
        method: 'POST',
        headers: authHeaders
      });
      const data = await response.json();
      if (!response.ok) {
        showMessage(data.message || 'Could not send the order confirmation code.', true);
        return;
      }
      setStage('otp');
      showMessage(data.message);
    } catch (error) {
      console.error('Order confirmation code request failed:', error);
      showMessage('Could not contact the server to send your order confirmation code.', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    showMessage('');
    try {
      const verificationResponse = await fetch('/api/orders/verify-otp', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ otp })
      });
      const verification = await verificationResponse.json();
      if (!verificationResponse.ok) {
        showMessage(verification.message || 'The order confirmation code could not be verified.', true);
        return;
      }

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          orderAuthorization: verification.orderAuthorization,
          paymentMethod: 'Razorpay',
          orderItems: cartItems.map((item) => ({
            product: item._id || item.productId,
            qty: Number(item.qty)
          })),
          shippingAddress: {
            fullName: address.fullName,
            phone: address.phone,
            altPhone: address.altPhone,
            address: address.street,
            city: address.city,
            district: address.district,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country
          }
        })
      });
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        setStage('details');
        setOtp('');
        showMessage(`${orderData.message || 'Could not create the order.'} Request a new email code to try again.`, true);
        return;
      }

      setOtp('');
      setPendingOrderId(orderData.order._id);
      setStage('payment');
      try {
        await startPayment(orderData.order._id);
      } catch (error) {
        console.error('Payment setup failed:', error);
        showMessage('Your order is saved, but payment could not be started. You can retry payment below.', true);
      }
    } catch (error) {
      console.error('Order confirmation failed:', error);
      setStage('details');
      showMessage('Could not complete the order. Please request a new email code and try again.', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (stage === 'otp') {
      handleVerifyOtp(event);
    } else if (stage === 'payment' && pendingOrderId) {
      setIsSubmitting(true);
      startPayment(pendingOrderId)
        .catch((error) => {
          console.error('Payment retry failed:', error);
          showMessage('Could not start payment. Please try again.', true);
        })
        .finally(() => setIsSubmitting(false));
    } else {
      handleRequestOtp();
    }
  };

  if (stage === 'complete') {
    return (
      <div className="checkout-container">
        <h2>{t('paymentComplete')}</h2>
        <div className="checkout-content">
          <div className="shipping-form">
            <p className="checkout-message" role="status">{t('orderConfirmed')}</p>
            <button type="button" className="btn" onClick={() => navigate('/shop')}>{t('goBack')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <h2>{t('checkout')}</h2>
      <div className="checkout-content">
        <form onSubmit={handleSubmit} className="shipping-form">
          <div className="shipping-form-heading">
            <span className="shipping-step">{stage === 'otp' ? t('orderConfirmation') : stage === 'payment' ? t('payment') : t('deliveryDetails')}</span>
            <h3>{stage === 'otp' ? t('confirmYou') : stage === 'payment' ? t('completePayment') : t('shippingAddress')}</h3>
            <p>
              {stage === 'otp'
                ? t('otpPrompt', { email: user?.email || '' })
                : stage === 'payment'
                  ? t('paymentPrompt')
                  : t('orderCodePrompt')}
            </p>
          </div>

          {stage === 'details' && (
            <div className="shipping-fields">
              <label className="shipping-field">
                <span>{t('fullName')}</span>
                <input type="text" autoComplete="name" placeholder={t('fullName')} required value={address.fullName} onChange={(event) => setAddress({ ...address, fullName: event.target.value })} />
              </label>
              <label className="shipping-field">
                <span>{t('phone')}</span>
                <input type="tel" autoComplete="tel" placeholder={t('phone')} required value={address.phone} onChange={(event) => setAddress({ ...address, phone: event.target.value })} />
              </label>
              <label className="shipping-field">
                <span>{t('alternativePhone')} <small>{t('optional')}</small></span>
                <input type="tel" autoComplete="tel-national" placeholder={t('alternativePhone')} value={address.altPhone || ''} onChange={(event) => setAddress({ ...address, altPhone: event.target.value })} />
              </label>
              <label className="shipping-field">
                <span>{t('street')}</span>
                <input type="text" autoComplete="street-address" placeholder={t('street')} required value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} />
              </label>
              <label className="shipping-field">
                <span>{t('state')}</span>
                <select
                  autoComplete="address-level1"
                  required
                  value={address.state}
                  onChange={(event) => setAddress({ ...address, state: event.target.value, district: '', city: '' })}
                >
                  <option value="">{t('selectState')}</option>
                  {INDIAN_STATES_AND_UTS.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
              </label>
              <label className="shipping-field">
                <span>{t('district')}</span>
                {DISTRICTS_BY_STATE[address.state]?.length ? (
                  <select
                    required
                    value={address.district}
                    onChange={(event) => setAddress({ ...address, district: event.target.value, city: event.target.value })}
                  >
                    <option value="">{t('selectDistrict')}</option>
                    {Array.from(new Set([...DISTRICTS_BY_STATE[address.state], ...(address.district ? [address.district] : [])])).map((district) => <option key={district} value={district}>{district}</option>)}
                  </select>
                ) : (
                  <input
                    required
                    disabled={!address.state}
                    placeholder={address.state ? t('enterDistrict') : t('selectStateFirst')}
                    value={address.district}
                    onChange={(event) => setAddress({ ...address, district: event.target.value, city: event.target.value })}
                  />
                )}
              </label>
              <label className="shipping-field">
                <span>{t('pinCode')}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder={t('sixDigitPin')}
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={address.postalCode}
                  onChange={(event) => setAddress({ ...address, postalCode: event.target.value.replace(/\D/g, '').slice(0, 6) })}
                />
                {pinLookup.message && <span className={pinLookup.isError ? 'pin-lookup-message is-error' : 'pin-lookup-message'} role={pinLookup.isError ? 'alert' : 'status'}>{pinLookup.message}</span>}
              </label>
            </div>
          )}
          {stage === 'otp' && (
            <div className="shipping-fields">
              <label className="shipping-field">
                <span>{t('emailCode')}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder={t('enterCode')}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </label>
              <button type="button" className="auth-text-button" onClick={handleRequestOtp} disabled={isSubmitting}>
                {t('resendCode')}
              </button>
            </div>
          )}

          {message && <p className={messageIsError ? 'checkout-message checkout-message-error' : 'checkout-message'} role={messageIsError ? 'alert' : 'status'}>{message}</p>}

          <div className="checkout-summary">
            <div className="checkout-price-breakdown" aria-label="Order total breakdown">
              <div><span>{t('itemsSubtotal')}</span><strong>₹{itemsPrice.toFixed(2)}</strong></div>
              <div><span>{t('tax')}</span><strong>₹{taxPrice.toFixed(2)}</strong></div>
              <div><span>{t('promiseFee')}</span><strong>₹{promiseFee.toFixed(2)}</strong></div>
              <div><span>{t('deliveryFee')}</span><strong>₹{shippingPrice.toFixed(2)}</strong></div>
              <div className="checkout-total-row"><span>{t('totalToPay')}</span><strong>₹{totalPrice.toFixed(2)}</strong></div>
            </div>
            <button type="submit" className="btn" disabled={isSubmitting || cartItems.length === 0}>
              {isSubmitting
                ? t('pleaseWait')
                : stage === 'otp'
                  ? t('verifyPlaceOrder')
                  : stage === 'payment'
                    ? t('retryPayment')
                    : t('emailMeCode')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
