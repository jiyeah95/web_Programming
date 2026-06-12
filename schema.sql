CREATE TABLE IF NOT EXISTS users (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,

                                     username TEXT UNIQUE NOT NULL,
                                     password TEXT NOT NULL,

                                     name TEXT NOT NULL,
                                     email TEXT UNIQUE NOT NULL,

                                     phone TEXT NOT NULL,

                                     birth TEXT NOT NULL,

                                     gender TEXT,

                                     address TEXT,

                                     agree_privacy INTEGER NOT NULL,

                                     agree_sms INTEGER DEFAULT 0,
                                     agree_email INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS posts (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     title TEXT NOT NULL,
                                     content TEXT NOT NULL,
                                     parent_id INTEGER,
                                     author TEXT,
                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
                                     id INTEGER PRIMARY KEY AUTOINCREMENT,
                                     post_id INTEGER NOT NULL,
                                     filename TEXT NOT NULL,
                                     filepath TEXT NOT NULL,
                                     FOREIGN KEY(post_id) REFERENCES posts(id)
    );

CREATE TABLE IF NOT EXISTS products (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        name TEXT NOT NULL,
                                        price INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                                      user_id INTEGER NOT NULL,
                                      total_price INTEGER NOT NULL,
                                      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
                                           id INTEGER PRIMARY KEY AUTOINCREMENT,
                                           order_id INTEGER NOT NULL,
                                           product_name TEXT NOT NULL,
                                           price INTEGER NOT NULL,
                                           quantity INTEGER NOT NULL
);


CREATE TABLE IF NOT EXISTS wishlist (
                                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                                        user_id INTEGER NOT NULL,
                                        product_id INTEGER NOT NULL
);