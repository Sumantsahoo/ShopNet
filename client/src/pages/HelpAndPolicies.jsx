import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/help.css';

const faqs = [
    { question: 'How do I find a product?', answer: 'Use the search box or browse a category. Search results match product names, descriptions, and categories.' },
    { question: 'Where can I see my orders?', answer: 'Sign in and open Account, then My Orders to see payment and delivery progress.' },
    { question: 'Which payment options are available?', answer: 'Checkout uses the payment options currently offered by Razorpay for your order.' },
    { question: 'How is delivery progress updated?', answer: 'After payment is confirmed, the order page shows updates entered by the ShopNest administrator.' },
    { question: 'Can I request an exchange?', answer: 'For a paid and delivered order, the app currently accepts an exchange request within 10 days of delivery. The request is reviewed by an administrator.' }
];

const HelpAndPolicies = () => {
    const isPolicies = useLocation().pathname === '/policies';

    return (
        <main className="help-page">
            <header className="help-heading">
                <span>SHOPNEST HELP CENTER</span>
                <h1>{isPolicies ? 'Terms, policies & licenses' : 'Frequently asked questions'}</h1>
                <p>Information about shopping and using your ShopNest account.</p>
                <nav>
                    <Link className={!isPolicies ? 'is-active' : ''} to="/faq">FAQs</Link>
                    <Link className={isPolicies ? 'is-active' : ''} to="/policies">Terms & policies</Link>
                </nav>
            </header>
            {!isPolicies ? (
                <section className="faq-list">
                    {faqs.map(({ question, answer }) => (
                        <details key={question}>
                            <summary>{question}</summary>
                            <p>{answer}</p>
                        </details>
                    ))}
                    <Link className="help-orders-link" to="/orders">Still need help with an order or product? Open My Orders</Link>
                </section>
            ) : (
                <section className="policy-list">
                    <article><h2>Orders and payment</h2><p>Order totals, taxes, and delivery charges are shown at checkout before you confirm payment. Payment is confirmed after the payment provider verifies it.</p></article>
                    <article><h2>Product availability</h2><p>Product availability depends on the stock shown in the ShopNest catalog. Inventory is updated after a payment is confirmed.</p></article>
                    <article><h2>Delivery updates</h2><p>Delivery stages are updated by ShopNest administrators. Please check My Orders for the latest recorded status.</p></article>
                    <article><h2>Exchange requests</h2><p>The app currently supports exchange requests for paid, delivered orders within 10 days of delivery. Submitting a request does not guarantee approval.</p></article>
                    <article><h2>Privacy and payment details</h2><p>Payment details are entered through the payment provider's checkout. Do not share passwords or one-time codes with anyone.</p></article>
                    <article><h2>Licenses and product content</h2><p>Product images, names, and descriptions are provided as part of the catalog. ShopNest has not published a separate license schedule in this app; contact the store administrator for rights or licensing questions.</p></article>
                    <p className="policy-note">This page summarizes the features currently available in the app; it is not a substitute for reviewed legal terms.</p>
                </section>
            )}
        </main>
    );
};

export default HelpAndPolicies;
