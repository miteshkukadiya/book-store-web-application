const mongoose = require("mongoose");

const normalizeQuantity = (quantity = 1) => {
    const parsedQuantity = Number(quantity);
    return Number.isInteger(parsedQuantity) && parsedQuantity >= 1 ? parsedQuantity : 1;
};

const toObjectId = (value) => {
    if (!value) {
        return null;
    }

    if (value instanceof mongoose.Types.ObjectId) {
        return value;
    }

    if (value._id) {
        return toObjectId(value._id);
    }

    if (value._bsontype === "ObjectId" && mongoose.isValidObjectId(value)) {
        return value;
    }

    if (typeof value === "string" && mongoose.isValidObjectId(value)) {
        return new mongoose.Types.ObjectId(value);
    }

    const stringValue = typeof value.toString === "function" ? value.toString() : "";
    return mongoose.isValidObjectId(stringValue) ? new mongoose.Types.ObjectId(stringValue) : null;
};

const getCartItemBook = (cartItem) => {
    if (!cartItem) {
        return null;
    }

    return cartItem.book || cartItem;
};

const getCartItemBookId = (cartItem) => {
    const objectId = toObjectId(getCartItemBook(cartItem));
    return objectId ? objectId.toString() : null;
};

const normalizeCartForStorage = (cart = []) => {
    const normalizedCart = [];
    const itemByBookId = new Map();

    for (const cartItem of cart || []) {
        const bookObjectId = toObjectId(getCartItemBook(cartItem));
        if (!bookObjectId) {
            continue;
        }

        const bookId = bookObjectId.toString();
        const quantity = normalizeQuantity(cartItem?.quantity);
        const existingItem = itemByBookId.get(bookId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            const normalizedItem = { book: bookObjectId, quantity };
            itemByBookId.set(bookId, normalizedItem);
            normalizedCart.push(normalizedItem);
        }
    }

    return normalizedCart;
};

const getBookPrice = (book) => {
    const price = Number(book?.price);
    return Number.isFinite(price) && price > 0 ? price : 0;
};

const getBookStock = (book) => {
    const rawStock = typeof book?.get === "function" ? book.get("stock") : book?.stock;
    const stock = Number(rawStock);
    return Number.isFinite(stock) ? stock : null;
};

const getStockValidationError = (book, quantity) => {
    const stock = getBookStock(book);
    if (stock === null || quantity <= stock) {
        return null;
    }

    return `Only ${stock} copies of "${book.title}" are available`;
};

const buildCartResponse = (cart = []) => {
    const items = (cart || [])
        .filter((cartItem) => cartItem?.book)
        .map((cartItem) => {
            const quantity = normalizeQuantity(cartItem.quantity);
            const price = getBookPrice(cartItem.book);

            return {
                book: cartItem.book,
                quantity,
                subtotal: price * quantity,
            };
        });

    const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = items.reduce((total, item) => total + item.subtotal, 0);

    return { items, totalQuantity, cartTotal };
};

module.exports = {
    buildCartResponse,
    getBookPrice,
    getCartItemBookId,
    getStockValidationError,
    normalizeCartForStorage,
    normalizeQuantity,
    toObjectId,
};
