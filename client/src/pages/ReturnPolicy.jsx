import React from 'react';
const textualStyle={
        maxWidth:'900px',
        margin:'0 auto',
        padding:'40px',
        background:'#18181b',
        borderRadius:'16px',
        border:'1px solid rgba(255,255,255,0.05)',
        boxShadow:'0 10px 40px rgba(0,0,0,0.5)',
        textAlign:'center',
         color:'#a1a1aa'

    };
const ReturnPolicy=()=>{
    return (
        <div style={textualStyle}>
            <h2 style={{color:'#fff',marginBottom:'20px',borderBottom:'1px solid rgba(255,255,255,0.1)',paddingBottom:'15px'}}>Return & Refund Policy </h2>
            <p style={{
                marginBottom:'20px'
            }}>
                At ShopNest,we proudly stand behind the quality of our merchandise.If for any reason you are completely disatisfied with your purchase,you may securely intiate a return within 10 days of receiving your order
            </p>
            <h4 style={{color:'#f97316',marginTop:'25px',marginBottom:'10px'}}>1.Eligibility for returns</h4>
            <p style={{marginBottom:'15px'}}>
                To be eligible for a return,the item must be completly unused,housed in the same absolute condition that it was recevied,and maintained within its originial factory packaging.Receipts or proof purchase mapping are strictly required.
            </p>
            <h4 style={{color:"#f97316",marginTop:'25px',marginBottom:'10px'}}>2.Refund Processing</h4>
            <p style={{marginBottom:'15px'}}>
                Once your return is phsically received and internally inspected,an immediate email protocol will fire notifying you of the approval status.Approved refunds will cleanly propagate to Your original designated Razorpay gateway endPoint within 5-7 business working day naturally.
            </p>
            <h4 style={{color:'#f97316',marginTop:'25px',marginBottom:"10px"}}>3.Exempted Output Goods</h4>
            <p style={{marginBottom:'15px'}}>
                Certain explicit categories such as perishable items,custom software,digital media,or physically tampered items arfe hevaily restricted and do not qualify for  any standard refund sequence.
            </p>
            <h4 style={{color:'#f93716',marginTop:'25px',marginBottom:'10px'}}>4.Shipping Transit Costs</h4>
            <p style={{marginBottom:'15px'}}>
                You will actively remain strictly responsible for covering your own outbound logistical shipping rates associated with returning the item.Restockig fees may conditionally apply.
            </p>
        </div>
    );
};
export default ReturnPolicy;