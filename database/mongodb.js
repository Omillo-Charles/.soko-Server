import mongoose from "mongoose";
import { MONGODB_URI_USERS, MONGODB_URI_CONTACT, MONGODB_URI_PRODUCTS } from "../config/env.js";

const userConnection = mongoose.createConnection(MONGODB_URI_USERS);
const contactConnection = mongoose.createConnection(MONGODB_URI_CONTACT);
const productConnection = mongoose.createConnection(MONGODB_URI_PRODUCTS);

userConnection.on('connected', () => console.log('Connected to Users database'));
contactConnection.on('connected', () => console.log('Connected to Contacts database'));
productConnection.on('connected', () => console.log('Connected to Products database'));

userConnection.on('error', (err) => console.error('Users database connection error:', err));
contactConnection.on('error', (err) => console.error('Contacts database connection error:', err));
productConnection.on('error', (err) => console.error('Products database connection error:', err));

export { userConnection, contactConnection, productConnection };
