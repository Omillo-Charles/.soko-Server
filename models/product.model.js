import mongoose from "mongoose";
import { productConnection } from "../database/mongodb.js";

const productSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true
    },
    name: {
        type: String,
        required: [true, "Product name is required"],
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: [true, "Product description is required"],
        trim: true,
        maxlength: 2000
    },
    content: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: [true, "Product price is required"],
        min: 0
    },
    category: {
        type: String,
        required: [true, "Product category is required"]
    },
    stock: {
        type: Number,
        required: [true, "Product stock is required"],
        default: 1
    },
    image: {
        type: String,
        default: ""
    },
    images: {
        type: [String],
        default: []
    },
    rating: {
        type: Number,
        default: 0
    },
    reviewsCount: {
        type: Number,
        default: 0
    },
    likesCount: {
        type: Number,
        default: 0
    },
    repostsCount: {
        type: Number,
        default: 0
    },
    commentsCount: {
        type: Number,
        default: 0
    },
    sizes: {
        type: [String],
        default: []
    },
    colors: {
        type: [String],
        default: []
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

productSchema.virtual('variantOptions').get(function() {
    if (this.colors && this.colors.length > 0) {
        return this.colors.map((color, index) => ({
            name: color,
            image: (this.images && this.images[index]) ? this.images[index] : this.image
        }));
    }
    if (this.images && this.images.length > 0) {
        return this.images.map((img, index) => ({
            name: `Option ${index + 1}`,
            image: img
        }));
    }
    return [{ name: "Default", image: this.image }];
});

const Product = productConnection.model("Product", productSchema);

export default Product;
