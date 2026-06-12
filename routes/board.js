const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();

const dbPath = path.join(__dirname, '../db/database.sqlite');
const db = new sqlite3.Database(dbPath);

// 게시글 목록
router.get('/', (req, res) => {

    db.all(
        `SELECT * FROM posts
             ORDER BY COALESCE(parent_id, id) DESC, id ASC`,
        [],
        (err, rows) => {

            if (err) {
                console.log(err.message);
                return res.send('게시글 조회 실패');
            }

            rows.forEach(post => {

                const utcDate =
                    new Date(post.created_at + " UTC");

                post.created_at_kor =
                    utcDate.toLocaleString(
                        "ko-KR",
                        {
                            timeZone: "Asia/Seoul"
                        }
                    );

            });
            res.render('board', {
                posts: rows
            });
        }
    );
});


// 글쓰기 화면
router.get('/write', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/user/login');
    }

    res.render('post', {
        user: req.session.user
    });

});
// 글 저장
router.post('/write', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/user/login');
    }

    const { title, content, anonymous } = req.body;

    const author =
        anonymous
            ? '익명'
            : req.session.user.name;

    db.run(
        'INSERT INTO posts(title, content, author) VALUES(?,?,?)',
        [title, content, author],
        (err) => {

            if (err) {
                console.log(err.message);
                return res.send('저장 실패');
            }

            res.redirect('/board');
        }
    );
});

// 게시글 상세보기
router.get("/detail/:id", (req, res) => {

    const id = req.params.id;

    db.get(
        "SELECT * FROM posts WHERE id=?",
        [id],
        (err, post) => {

            if (!post) {
                return res.send("게시글이 없습니다.");
            }

            db.get(
                "SELECT id, title FROM posts WHERE id < ? ORDER BY id DESC LIMIT 1",
                [id],
                (err, prevPost) => {

                    db.get(
                        "SELECT id, title FROM posts WHERE id > ? ORDER BY id ASC LIMIT 1",
                        [id],
                        (err, nextPost) => {

                            res.render("detail", {
                                post,
                                prevPost,
                                nextPost,
                                user: req.session.user
                            });

                        }
                    );

                }
            );

        }
    );

});

// 수정 화면
router.get('/edit/:id', (req, res) => {

    const postId = req.params.id;

    db.get(
        'SELECT * FROM posts WHERE id = ?',
        [postId],
        (err, row) => {

            if (err || !row) {
                return res.send('게시글 없음');
            }
            if (!req.session.user) {
                return res.redirect('/user/login');
            }

            if (row.author !== req.session.user.name) {
                return res.send('권한 없음');
            }

            res.render('edit', {
                post: row
            });
        }
    );
});

// 수정 처리
router.post('/edit/:id', (req, res) => {

    const postId = req.params.id;
    const { title, content } = req.body;

    db.run(
        'UPDATE posts SET title = ?, content = ? WHERE id = ?',
        [title, content, postId],
        (err) => {

            if (err) {
                console.log(err.message);
                return res.send('수정 실패');
            }

            res.redirect('/board/detail/' + postId);
        }
    );
});

// 삭제
router.get('/delete/:id', (req, res) => {

    const postId = req.params.id;

    // 먼저 글 조회
    db.get(
        'SELECT * FROM posts WHERE id = ?',
        [postId],
        (err, row) => {

            if (err || !row) {
                return res.send('게시글 없음');
            }

            // 작성자 확인
            const currentUser = req.session.user?.name;

            // 익명 글이면 admin만 삭제 가능
            if (row.author === '익명') {

                if (currentUser !== 'admin') {
                    return res.send('익명 글은 admin만 삭제할 수 있습니다.');
                }

            }
// 일반 글이면 작성자만 삭제 가능
            else {

                if (row.author !== currentUser) {
                    return res.send('권한 없음');
                }

            }

            // 삭제 실행
            db.run(
                'DELETE FROM posts WHERE id = ?',
                [postId],
                (err) => {

                    if (err) {
                        console.log(err.message);
                        return res.send('삭제 실패');
                    }

                    res.redirect('/board');
                }
            );
        }
    );
});

// 답글 화면
// 답글 화면
router.get('/reply/:id', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/user/login');
    }

    const parentId = req.params.id;

    db.get(
        'SELECT * FROM posts WHERE id = ?',
        [parentId],
        (err, row) => {

            if (err || !row) {
                return res.send('원글 없음');
            }

            res.render('reply', {
                parentId: parentId,
                parentTitle: row.title,
                user: req.session.user
            });
        }
    );
});

router.post('/reply', (req, res) => {

    if (!req.session.user) {
        return res.redirect('/user/login');
    }

    const {
        title,
        content,
        parent_id,
        anonymous
    } = req.body;

    const author =
        anonymous
            ? '익명'
            : req.session.user.name;

    db.run(
        `INSERT INTO posts
             (title, content, parent_id, author)
         VALUES (?, ?, ?, ?)`,
        [title, content, parent_id, author],
        (err) => {

            if (err) {
                console.log(err.message);
                return res.send('답글 저장 실패');
            }

            res.redirect('/board');
        }
    );
});

module.exports = router;