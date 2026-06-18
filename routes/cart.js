const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const router = express.Router();

const dbPath = path.join(__dirname, "../db/database.sqlite");
const db = new sqlite3.Database(dbPath);


// 로그인 체크
function checkLogin(req, res, next) {

    if (!req.session.user) {
        return res.redirect("/user/login");
    }

    next();
}

// 장바구니 추가
router.post("/add/:id", checkLogin, (req, res) => {

    const productId = req.params.id;
    const userId = req.session.user.id;

    const returnUrl =
        req.body.returnUrl || "/product";

    db.get(
        "SELECT * FROM cart WHERE product_id = ? AND user_id = ?",
        [productId, userId],
        (err, row) => {

            if (err) {
                return res.send("DB 오류");
            }

            // 이미 담겨있으면 수량 증가
            if (row) {

                db.run(
                    "UPDATE cart SET quantity = quantity + 1 WHERE product_id = ? AND user_id = ?",
                    [productId, userId],
                    (err) => {

                        if (err) {
                            return res.send("DB 오류");
                        }

                        res.redirect(returnUrl + "?cart=1");
                    }
                );

            } else {

                db.run(
                    "INSERT INTO cart(product_id, quantity, user_id) VALUES(?, 1, ?)",
                    [productId, userId],
                    (err) => {

                        if (err) {
                            return res.send("DB 오류");
                        }

                        res.redirect(returnUrl + "?cart=1");
                    }
                );

            }
        }
    );
});

// 장바구니 목록
router.get("/", checkLogin, (req, res) => {

    const userId = req.session.user.id;

    const sql = `
        SELECT
            cart.id,
            products.name,
            products.price,
            cart.quantity
        FROM cart
        JOIN products
        ON cart.product_id = products.id
        WHERE cart.user_id = ?
        ORDER BY cart.id DESC
    `;

    db.all(sql, [userId], (err, rows) => {

        if (err) {
            console.error(err);
            return res.send(err.message);
        }

        const totalPrice = rows.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        res.render("cart", {
            cartItems: rows,
            totalPrice
        });
    });
});

// 삭제
router.post("/delete/:id", checkLogin, (req, res) => {

    const cartId = req.params.id;

    db.run(
        "DELETE FROM cart WHERE id = ?",
        [cartId],
        (err) => {

            if (err) {
                return res.send("DB 오류");
            }

            res.redirect("/cart");
        }
    );
});

// 수량 증가
router.post("/plus/:id", checkLogin, (req, res) => {

    const cartId = req.params.id;

    db.run(
        "UPDATE cart SET quantity = quantity + 1 WHERE id = ?",
        [cartId],
        (err) => {

            if (err) {
                return res.send("DB 오류");
            }

            res.redirect("/cart");
        }
    );
});

// 수량 감소
router.post("/minus/:id", checkLogin, (req, res) => {

    const cartId = req.params.id;

    db.get(
        "SELECT quantity FROM cart WHERE id = ?",
        [cartId],
        (err, row) => {

            if (err) {
                return res.send("DB 오류");
            }

            if (!row) {
                return res.redirect("/cart");
            }

            if (row.quantity <= 1) {

                db.run(
                    "DELETE FROM cart WHERE id = ?",
                    [cartId],
                    () => {
                        res.redirect("/cart");
                    }
                );

            } else {

                db.run(
                    "UPDATE cart SET quantity = quantity - 1 WHERE id = ?",
                    [cartId],
                    () => {
                        res.redirect("/cart");
                    }
                );

            }
        }
    );
});

module.exports = router;