import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/home';
import About from './pages/About';
import Disclaimer from './pages/Disclaimer';
import ReturnPolicy from './pages/ReturnPolicy';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductDetail from  './pages/ProductDetail'
import AddProduct from './admin/AddProduct';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import AdminOrders from './admin/AdminOrders';
import AdminDashboard from './admin/AdminDashboard';
import AdminUsers from './admin/AdminUsers';
import EditProduct from './admin/EditProduct';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/shop' element={<Home />} />
        <Route path='/about' element={<About />} />
        <Route path='/disclaimer' element={<Disclaimer />} />
        <Route path='/return' element={<ReturnPolicy />} />
        <Route path='/login' element={<Login/>} />
        <Route path='/register' element={<Register/>} />
        <Route path='/cart' element={<Cart/>} />
        <Route path='/checkout' element={<Checkout/>} />
        <Route path='/orders' element={<Orders/>} />
        <Route path='/profile' element={<Profile/>} />
        <Route path='/admin' element={<AdminDashboard />} />
        <Route path='/admin/products/new' element={<AddProduct />} />
        <Route path='/admin/products/edit' element={<EditProduct />} />
        <Route path='/admin/products/:id/edit' element={<EditProduct />} />
        <Route path='/admin/users' element={<AdminUsers />} />
        <Route path='/admin/orders' element={<AdminOrders />} />
        <Route path='/products/:id' element={<ProductDetail />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
