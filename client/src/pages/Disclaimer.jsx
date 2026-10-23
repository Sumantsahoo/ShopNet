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
const Disclaimer=()=>{
    
      return(
        <div style={textualStyle}>
            <h2 style={{color:'#fff',marginBottom:'10px',borderBottom:'1px solid rgba(255,255,255,0.1)',paddingBottom:'15px'}}>1.Legal & Site Disclaimer</h2>
            <p style={{marginBottom:'20px'}}>
                The data,interferences,and graphical components represnted across  the ShopNest domain Strictly act uniquely as an educational development platform.This codebase models rigorous application structures and architectures for purely demonstrative ,portfolio-oriented enginerring usage.
            </p>
            <h4 style={{color:'#f97316',marginTop:'25px',marginBottom:'10px'}}>
                2.payment Processing Restriction
            </h4>
            <p style={{marginBottom:'15px'}}>
                No authentic financial variables are handled natievly within this enviornment.All payment endpoints  forcefully bind exclusievly to external testing-based networks (sandbox Razorpay enviorments ).No exact deductibles exist.
            </p>
            <h4 style={{color:'#f97316',marginTop:'25px',marginBottom:'10px'}}>3.External Binding Links</h4>
            <p style={{marginBottom:'15px'}}>
                ShopNest operates completly independent domains and takes strictly zero absolute parameter responsiblity over the specific contents or behaviors populated via external routing anchors generated implicity by third party configurations.
            </p>
        </div>
      )
};
export default Disclaimer;