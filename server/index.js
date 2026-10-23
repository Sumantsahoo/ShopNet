const path=require("path");
const express=require('express');
const cors=require("cors");
const dotenv=require("dotenv");
dotenv.config({path:require('path').join(__dirname,'.env')});
const connectDB=require("./config/db");
const userRoutes=require('./routes/authoriteRoutes');
connectDB();

const app=express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
const frontendOrigins = [
    ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
    process.env.FRONTEND_URL,
    process.env.FRONTED_URL
].filter(Boolean).flatMap((origin) => origin.split(',').map((value) => value.trim()).filter(Boolean));
app.use(cors({
    origin: frontendOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.get("/",(req,res)=>{
    res.send("shopnet backend is working properly");

});
app.use('/api/authorite',userRoutes);
app.use('/api/products',require('./routes/productRoutes'));
app.use('/api/cart',require('./routes/cartRoutes'));
app.use('/api/payment',require('./routes/paymentRoutes'));
app.use('/api/orders',require('./routes/orderRoutes'));
app.use('/api/address',require('./routes/addressRoutes'));
app.use('/api/analytics',require('./routes/analyticsRoutes'));
 //server fronted in production
 if(process.env.NODE_ENV==='production'){
    app.use(express.static(path.join(__dirname,'../client/build')));
    app.get('/{*splat}',(req,res)=>{
        res.sendFile(path.resolve(__dirname,'../client/build/index.html'));
    });
 } else{
    app.get('/api',(req,res)=>{
        res.send('ShopNet API is running in development mode...')
    })
 }

const PORT=process.env.PORT||5000;
app.listen(PORT,()=>{
        console.log(`server is running at http://localhost:${PORT}`);
    });
