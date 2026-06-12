const express = require('express');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '../db/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log("현재 DB 경로:");
console.log(dbPath);

// 회원가입 시작 페이지
router.get('/register', (req, res) => {
    res.render('join');
});

router.get('/agree', (req, res) => {
    res.render('agree');
});

router.get('/registerForm', (req, res) => {
    res.render('register');
});

// 회원가입 처리
// 회원가입 처리
router.post('/register', async (req, res) => {

    const {
        username,
        password,
        password2,
        name,
        email,
        phone,
        birth,
        gender,
        address
    } = req.body;

    if (password !== password2) {
        const emailRegex =
            /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

        if (!emailRegex.test(email)) {
            return res.send(
                "이메일 형식이 올바르지 않습니다."
            );
        }

        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

        if (!passwordRegex.test(password)) {
            return res.send(
                "비밀번호 형식이 올바르지 않습니다."
            );
        }

        const phoneRegex =
            /^010-\d{4}-\d{4}$/;

        if (!phoneRegex.test(phone)) {
            return res.send(
                "연락처 형식이 올바르지 않습니다."
            );
        }
        return res.send('비밀번호가 일치하지 않습니다.');
    }

    const hashedPassword =
        await bcrypt.hash(password, 10);

    db.run(
        `
        INSERT INTO users(
            username,
            password,
            name,
            email,
            phone,
            birth,
            gender,
            address,
            agree_privacy,
            agree_sms,
            agree_email
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?)
        `,
        [
            username,
            hashedPassword,
            name,
            email,
            phone,
            birth,
            gender || null,
            address || null,
            1,
            0,
            0
        ],
        (err) => {

            if (err) {

                console.error(err);

                if (
                    err.message.includes('users.username')
                ) {
                    return res.send(
                        '이미 사용중인 아이디입니다.'
                    );
                }

                if (
                    err.message.includes('users.email')
                ) {
                    return res.send(
                        '이미 사용중인 이메일입니다.'
                    );
                }

                return res.send('회원가입 실패');
            }

            res.render('registerComplete');
        }
    );
});


router.get('/check-username', (req, res) => {

    const username =
        req.query.username;

    db.get(
        'SELECT * FROM users WHERE username=?',
        [username],
        (err, user) => {

            if (user) {
                return res.send(
                    '이미 사용중인 아이디'
                );
            }

            res.send(
                '사용 가능한 아이디'
            );
        }
    );
});

router.get('/check-email', (req, res) => {

    const email =
        req.query.email;

    db.get(
        'SELECT * FROM users WHERE email=?',
        [email],
        (err, user) => {

            if (user) {
                return res.send(
                    '이미 사용중인 이메일'
                );
            }

            res.send(
                '사용 가능한 이메일'
            );
        }
    );
});

// 로그인 화면
router.get('/login', (req, res) => {

    res.render(
        'login',
        {
            error:null
        }
    );
});
// 로그인 처리
router.post('/login', (req, res) => {

    const { username, password } = req.body;

    db.get(
        'SELECT * FROM users WHERE username=?',
        [username],
        async (err, user) => {

            if (err || !user) {

                return res.render(
                    'login',
                    {
                        error:'존재하지 않는 사용자입니다.'
                    }
                );
            }

            const match =
                await bcrypt.compare(password, user.password);

            if (match) {

                req.session.user = user;

                res.redirect('/');
            }
            else {

                res.status(401)
                    .render('login_failed');
            }
        }
    );
});

router.get('/profile', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/user/login');
    }

    db.get(
        'SELECT * FROM users WHERE id=?',
        [req.session.user.id],
        (err, user) => {

            if (err || !user) {
                return res.send('사용자를 찾을 수 없습니다.');
            }

            res.render('profile', { user });
        }
    );
});

router.post('/profile', (req, res) => {

    const {
        userid,
        name,
        email,
        phone,
        address
    } = req.body;

    db.run(
        `
        UPDATE users
        SET
            userid=?,
            name=?,
            email=?,
            phone=?,
            address=?,
            agree_sms=?,
            agree_email=?
        WHERE id=?
        `,
        [
            name,
            email,
            phone,
            address,
            agree_sms ? 1 : 0,
            agree_email ? 1 : 0,
            req.session.user.id
        ],
        (err) => {

            if (err) {
                console.error(err);
                return res.send('수정 실패');
            }

            req.session.user.name = name;
            req.session.user.email = email;
            req.session.user.phone = phone;
            req.session.user.address = address;

            res.redirect('/');
        }
    );
});

router.post('/reset-password', async (req, res) => {

    const {
        userId,
        password,
        password2
    } = req.body;

    if (password !== password2) {

        return res.send(
            '비밀번호가 일치하지 않습니다.'
        );
    }

    const hashedPassword =
        await bcrypt.hash(password, 10);

    db.run(
        `
        UPDATE users
        SET password=?
        WHERE id=?
        `,
        [
            hashedPassword,
            userId
        ],
        (err) => {

            if (err) {

                return res.send(
                    '비밀번호 변경 실패'
                );
            }

            res.render('reset_complete');
        }
    );
});

router.get('/mypage', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/user/login');
    }

    db.get(
        'SELECT * FROM users WHERE id=?',
        [req.session.user.id],
        (err, user) => {

            if (err || !user) {
                return res.send('사용자를 찾을 수 없습니다.');
            }

            res.render(
                'mypage',
                { user }
            );
        }
    );
});

router.get('/wishlist', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/user/login');
    }

    db.all(
        `
        SELECT
            products.*
        FROM wishlist
        JOIN products
            ON wishlist.product_id = products.id
        WHERE wishlist.user_id = ?
        `,
        [req.session.user.id],
        (err, products) => {

            if (err) {
                console.error(err);
                return res.send('위시리스트 조회 실패');
            }

            res.render(
                'wishlist',
                { products }
            );
        }
    );
});

// 로그아웃
router.get('/logout', (req, res) => {

    req.session.destroy(() => {

        res.redirect('/');
    });
});
//아이디 찾기 화면
router.get('/find-id', (req, res) => {

    res.render('find_id');
});

//아이디 찾기 처리
router.post('/find-id', (req, res) => {

    const { name, email } = req.body;

    db.get(
        `
        SELECT username
        FROM users
        WHERE name=? AND email=?
        `,
        [name, email],
        (err, user) => {

            if (!user) {

                return res.send(
                    '일치하는 회원정보가 없습니다.'
                );
            }

            res.render(
                'find_id_result',
                {
                    username:user.username
                }
            );
        }
    );
});

//비밀번호 찾기 화면
router.get('/find-password', (req, res) => {

    res.render('find_password');
});

//비밀번호 찾기 처리
router.post('/find-password', (req, res) => {

    const {
        username,
        email
    } = req.body;

    db.get(
        `
        SELECT *
        FROM users
        WHERE username=? AND email=?
        `,
        [username, email],
        (err, user) => {

            if (!user) {

                return res.send(
                    '일치하는 회원정보가 없습니다.'
                );
            }

            res.render(
                'reset_password',
                {
                    userId:user.id
                }
            );
        }
    );
});

router.get("/address", (req, res) => {

    res.render("address");

});

module.exports = router;