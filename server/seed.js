const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./model/user');
const Product = require('./model/product');
const Order = require('./model/order');

const demoUsers = {
	customer: {
		name: 'Demo Customer',
		email: 'customer@example.com',
		password: 'Customer123!',
		role: 'user'
	}
};

const demoProducts = [
	{
		name: 'Wireless Headphones',
		description: 'Bluetooth headphones with noise reduction and long battery life.',
		price: 2499,
		category: 'Electronics',
		stock: 25,
		imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
	},
	{
		name: 'Cotton Hoodie',
		description: 'Comfortable cotton hoodie for everyday wear.',
		price: 1499,
		category: 'Fashion',
		stock: 40,
		imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80'
	},
	{
		name: 'Ceramic Coffee Mug',
		description: 'Durable ceramic mug with a simple modern finish.',
		price: 399,
		category: 'Home',
		stock: 60,
		imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80'
	}
];

const upsertUser = async (userData) => {
	const password = await bcrypt.hash(userData.password, 10);
	return User.findOneAndUpdate(
		{ email: userData.email },
		{
			name: userData.name,
			email: userData.email,
			password,
			role: userData.role
		},
		{ returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
	);
};

const seed = async () => {
	if (!process.env.MONGO_URI) {
		throw new Error('MONGO_URI is missing from server/.env');
	}

	await mongoose.connect(process.env.MONGO_URI);
	console.log(`Connected to MongoDB database: ${mongoose.connection.name}`);

	const customer = await upsertUser(demoUsers.customer);
	console.log(`Customer ready: ${customer.email}`);

	const products = [];
	for (const productData of demoProducts) {
		const product = await Product.findOneAndUpdate(
			{ name: productData.name },
			productData,
			{ returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
		);
		products.push(product);
	}
	console.log(`Products ready: ${products.length}`);

	const existingOrder = await Order.findOne({
		user: customer._id,
		'orderItems.product': products[0]._id
	});

	if (!existingOrder) {
		const item = {
			name: products[0].name,
			qty: 1,
			price: products[0].price,
			product: products[0]._id
		};
		const itemsPrice = item.price * item.qty;
		const taxPrice = Math.round(itemsPrice * 0.005 * 100) / 100;
		const promiseFee = 5;
		const shippingPrice = 9;
		const totalPrice = Math.round((itemsPrice + taxPrice + promiseFee + shippingPrice) * 100) / 100;

		await Order.create({
			user: customer._id,
			orderItems: [item],
			shippingAddress: {
				fullName: customer.name,
				phone: '9000000000',
				address: '123 Demo Street',
				city: 'Bhubaneswar',
				district: 'Khordha',
				state: 'Odisha',
				postalCode: '751001',
				country: 'India'
			},
			paymentMethod: 'COD',
			status: 'pending',
			itemsPrice,
			taxPrice,
			promiseFee,
			shippingPrice,
			totalPrice
		});
		console.log('Demo order created');
	} else {
		console.log('Demo order already exists');
	}
};

seed()
	.then(async () => {
		await mongoose.disconnect();
		console.log('Database seeding completed');
	})
	.catch(async (error) => {
		console.error('Database seeding failed:', error.message);
		await mongoose.disconnect();
		process.exitCode = 1;
	});
