const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const router = express.Router();

const dbPath = path.join(__dirname, "../db/database.sqlite");
const db = new sqlite3.Database(dbPath);


// 추천 상품 페이지
router.get("/", (req, res) => {

    db.all(
        "SELECT * FROM products ORDER BY id DESC",
        [],
        (err, allProducts) => {

            if (err) {
                return res.send("DB 오류");
            }

            db.all(
                `SELECT *
                 FROM products
                 WHERE is_featured = 1
                 ORDER BY likes DESC
                 LIMIT 4`,
                [],
                (err, featuredProducts) => {

                    if (err) {
                        return res.send("DB 오류");
                    }

                    res.render("product/list", {
                        allProducts,
                        featuredProducts
                    });
                }
            );
        }
    );
});


// 전체 상품 보기
router.get("/all", (req, res) => {

    db.all(
        "SELECT * FROM products ORDER BY id DESC",
        [],
        (err, rows) => {

            if (err) {
                return res.send("DB 오류");
            }

            res.render("product/all", {
                products: rows
            });
        }
    );
});

module.exports = router;