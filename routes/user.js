const express = require('express');
const db = require('../mysql');

const router = express.Router();

router.post('/', (req, res) => {
	var id = req.body.id;
	var name = req.body.name;
	var image = req.body.profile_image;
	console.log(name + '님 로그인');
	var sql = `SELECT * FROM user WHERE id = ${id}`;

	db.query(sql, (err, result) => {
		if(err)	console.log(err);
		else {
			if(result.length === 0) {
				var joinSql = 'INSERT INTO user(id, name, profile_image, car_number, message) VALUES (?, ?, ?, "", "")';
				var params = [id, name, image];
				db.query(joinSql, params, (err2, result2) => {
					if(err2) console.log(err2);
					else res.send(`${name} 님이 회원가입 하셨습니다.`);
				});
			}
			else {
				var updateSql = 'UPDATE user SET name = ?, profile_image = ? WHERE id = ?';
				var params = [name, image, id];
				db.query(updateSql, params, (err2, result2) => {
					if(err2) console.log(err2);	
					else res.send(`${name} 님이 로그인 하셨습니다.`);
				});
			}
		}
	});
});

router.get('/', (req, res) => {
	var id = req.query.id;
	var sql = `SELECT car_number, message FROM user WHERE id = ${id}`;
	db.query(sql, (err, result) => {
		if(err) console.log(err);
		res.json({
			'car_number' : result[0].car_number,
			'message' : result[0].message
		});
	});
});

router.get('/car', (req, res) => {
	var id = req.query.id;
	var sql = `SELECT * FROM car WHERE id = (SELECT car_id FROM user WHERE id=${id})`;
	db.query(sql, (err, result) => {
		if(err) res.json('차량 정보 전송 실패');
		else res.json(result[0]);
	});
});

router.get('/membership', (req, res) => {
	var id = req.query.id;
	var sql = `SELECT membership.id as id, card_name, image FROM membership_list INNER JOIN membership on membership_id=membership.id WHERE user_id = ${id}`;
	db.query(sql, (err, result) => {
		if(err) console.log('회원 카드 정보 전송 실패');
		else res.json(result);
	});
});

router.get('/payment', (req, res) => {
	var id = req.query.id;
	var sql = `SELECT payment_id as id, card_name, image FROM payment_list INNER JOIN payment on payment_id=payment.id WHERE user_id = ${id}`;
	db.query(sql, (err, result) => {
		if(err) console.log('결제 카드 정보 전송 실패');
		else res.json(result);
	});
});

router.get('/fee', (req, res) => {
	var non_member = 'SELECT busiId, non_member as fee FROM membership_fee';
	db.query(non_member, (err1, result1) => {
		if(err1) res.json(err1);
		else {
			var member = `SELECT busiId, member FROM membership_fee WHERE busiId IN (SELECT membership_id as membership FROM membership_list WHERE user_id=${req.query.id});`;

			var roaming = `SELECT MIN(CV) AS CV, MIN(EV) AS EV, MIN(GN) AS GN, MIN(HE) AS HE, MIN(JE) AS JE, MIN(KP) AS KP, MIN(KT) AS KT, MIN(ME) AS ME, MIN(PI) AS PI, MIN(PW) AS PW, MIN(SF) AS SF, MIN(ST) AS ST, MIN(KL) AS KL FROM roaming_fee WHERE membership IN (SELECT membership_id FROM membership_list WHERE user_id=${req.query.id});`;
			db.query(member + roaming, (err2, results) => {
				if(err2) res.json(err2);
				else {
					for(j in result1) {
						for(i in results[0]) {
							if(result1[j].busiId == results[0][i].busiId)
								result1[j].fee = results[0][i].member;
						}

						for(i in results[1][0]) {
							if(result1[j].busiId == i) {
								if(results[1][0][i] == null);
								else if(result1[j].fee == null || result1[j].fee > results[1][0][i])
									result1[j].fee = results[1][0][i];
							}
						}
					}
					res.json(result1);
				}
			})
		}
	})
});

router.put(`/:id`, (req, res) => {
	var sql = 'UPDATE user SET message=?, car_number=? WHERE id=?';
	var params = [req.body.message, req.body.car_number, req.params.id];
	db.query(sql, params, (err, result) => {
		if(err) console.log('회원정보 수정 실패', err);
		else res.send(`${req.params.id} 회원정보  수정 완료`);
	});
});

router.put(`/membership/:id`, (req, res) => {
	var sqlDelete = `DELETE FROM membership_list WHERE user_id=${req.params.id}`;
	db.query(sqlDelete, (err, result) => {});
	var sql = 'INSERT INTO membership_list(user_id, membership_id) VALUES (?, ?)'
	for(var i = 0; i < req.body.length; i++) {
		var params = [req.params.id, req.body[i].id];
		db.query(sql, params, (err, result) => { });
	}
});

router.put(`/payment/:id`, (req, res) => {
	var sqlDelete = `DELETE FROM payment_list WHERE user_id=${req.params.id}`;
	db.query(sqlDelete, (err, result) => {});
	var sql = 'INSERT INTO payment_list(user_id, payment_id) VALUES (?, ?)'
	for(var i = 0; i < req.body.length; i++) {
		var params = [req.params.id, req.body[i].id];
		db.query(sql, params, (err, result) => { });
	}
});

router.put(`/car/:id`, (req, res) => {
	var sql = 'UPDATE user SET car_id = (SELECT id FROM car WHERE vehicle_type = ?) WHERE id = ?';
	var params = [req.body.vehicle_type, req.params.id];
	db.query(sql, params, (err, result) => {
		if(err) res.send(err);
		else {
			var sql2 = `SELECT * FROM car WHERE id=(SELECT car_id FROM user WHERE id=${req.params.id})`;
			db.query(sql2, (err2, result2) => { res.json(result2[0]); });
		}
	});
});

router.delete(`/:id`, (req, res) => {
	console.log(`${req.params.id} 회원을 삭제합니다`);
	var sql = `DELETE FROM user WHERE id = ${req.params.id}`;
	db.query(sql, (err, result) => {
		if(err) console.log('회원 삭제 실패', err);
		else res.send(`${req.params.id} 회원 삭제 완료`);
	});
});

module.exports = router
