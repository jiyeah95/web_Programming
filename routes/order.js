const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const router = express.Router();

const dbPath = path.join(__dirname, "../db/database.sqlite");
const db = new sqlite3.Database(dbPath);

function checkLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect("/user/login");
    }

    next();
}

function formatKoreanTime(dateText) {
    const date = new Date(dateText + " UTC");

    return date.toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// 주문내역 목록
router.get("/", checkLogin, (req, res) => {
    const userId = req.session.user.id;

    db.all(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC",
        [userId],
        (err, orders) => {
            if (err) {
                console.error(err);
                return res.send("주문내역 조회 오류");
            }

            orders = orders.map((order, index) => {
                return {
                    ...order,
                    order_no: orders.length - index,
                    created_at_kor: formatKoreanTime(order.created_at)
                };
            });

            res.render("order", { orders });
        }
    );
});

// 주문 생성
router.post("/create", checkLogin, (req, res) => {
    const userId = req.session.user.id;

    db.all(
        `SELECT cart.id AS cart_id,
                products.name,
                products.price,
                cart.quantity
         FROM cart
                  JOIN products ON cart.product_id = products.id
         WHERE cart.user_id = ?`,
        [userId],
        (err, cartItems) => {
            if (err) {
                console.error(err);
                return res.send("장바구니 조회 오류");
            }

            if (cartItems.length === 0) {
                return res.redirect("/cart");
            }

            const totalPrice = cartItems.reduce((sum, item) => {
                return sum + item.price * item.quantity;
            }, 0);

            db.run(
                "INSERT INTO orders(user_id, total_price) VALUES(?, ?)",
                [userId, totalPrice],
                function (err) {
                    if (err) {
                        console.error(err);
                        return res.send("주문 생성 오류");
                    }

                    const orderId = this.lastID;

                    const stmt = db.prepare(
                        `INSERT INTO order_items(order_id, product_name, price, quantity)
                         VALUES(?, ?, ?, ?)`
                    );

                    cartItems.forEach(item => {
                        stmt.run(
                            orderId,
                            item.name,
                            item.price,
                            item.quantity
                        );
                    });

                    stmt.finalize();

                    db.run(
                        "DELETE FROM cart WHERE user_id = ?",
                        [userId],
                        (err) => {
                            if (err) {
                                console.error(err);
                                return res.send("장바구니 삭제 오류");
                            }

                            res.redirect("/order");
                        }
                    );
                }
            );
        }
    );
});

// 주문 상세보기
router.get("/:id", checkLogin, (req, res) => {
    const userId = req.session.user.id;
    const orderId = req.params.id;

    db.get(
        "SELECT * FROM orders WHERE id = ? AND user_id = ?",
        [orderId, userId],
        (err, order) => {
            if (err) {
                console.error(err);
                return res.send("주문 조회 오류");
            }

            if (!order) {
                return res.send("해당 주문을 볼 권한이 없습니다.");
            }

            db.all(
                "SELECT * FROM order_items WHERE order_id = ?",
                [orderId],
                (err, items) => {
                    if (err) {
                        console.error(err);
                        return res.send("주문 상세 조회 오류");
                    }

                    order.created_at_kor = formatKoreanTime(order.created_at);

                    res.render("order_detail", {
                        order,
                        items
                    });
                }
            );
        }
    );
});

module.exports = router;