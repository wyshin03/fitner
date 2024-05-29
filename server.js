//mongodb + Node.js 접속코드

const mongoclient = require('mongodb').MongoClient;
const ObjId = require('mongodb').ObjectId;  
const url = 'mongodb+srv://hojun3909:1234@cluster0.qbsl3m9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

let mydb;

mongoclient.connect(url, function(err, client){
   if(err){console.log(err);}

   mydb = client.db('myboard');
   console.log('connect');

   app.listen(8080, function(){
       console.log("포트8080으로 서버 대기 중 ...");
   });
})

   .then((client) => {
       mydb = client.db('myboard');
       mydb.collection('post').find().toArray().then(result=>{
           console.log(result);
       })
   })
   
   .catch((err)=> {
       console.log(err);
   });

    
/*
//MYSQL + Node.js 접속코드
var mysql = require("mysql");
var conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234",
    database: "myboard",
});
conn.connect();
conn.query("select * from post", function(err, rows, fields) {
    if (err) throw err;
    console.log(rows);
});
*/

const express = require('express');
const { MongoClient } = require("mongodb");
const app = express();
const sha = require('sha256');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));
const db = require('node-mysql/lib/db');app.use(bodyParser.urlencoded({extended:true}));
app.set('view engine', 'ejs');
app.use(express.static("public"));

let cookieParser = require('cookie-parser');
app.use(cookieParser('ncvka0e398423kpfd'));
app.get('/cookie', function(req, res){
    let milk = parseInt(req.signedCookies.milk) + 1000;
    if(isNaN(milk))
        {
            milk = 0;
        }
    res.cookie('milk', milk, {signed : true});
    res.send('product : '+ milk +'원');
});

let session = require('express-session');
app.use(session({
    secret : 'dkufe8938493j4e08349u',
    resave : false,
    saveUninitialized : true
}))

app.get("/session", function(req, res){
    if(isNaN(req.session.milk)){
        req.session.milk = 0;
    }
    req.session.milk = req.session.milk + 1000;
    res.send("session : " + req.session.milk + "원");
})

app.listen(8080, function(){
    console.log("포트 8080으로 서버 대기중 ... ")
});
app.get('/book', function(req, res){
    res.send('도서 목록 관련 페이지입니다.');
})
/*
app.get('/', function(req, res){
    res.send(
    '<html>\
    <body>\
    <h1>홈입니다. </h1>\
    <marquee>이창현님 반갑습니다.</marquee>\
    </body>\
    </html>'
    );
})
*/
app.get('/', function(req, res){
    if(req.session.user) {
        console.log("세션 유지");
        res.render("index.ejs", {user : req.session.user});
    }
    else{
        console.log("user : null");
        res.render("index.ejs", {user: null});
    }
});

app.get('/list', function(req, res){
    
    /*
    //MYSQL
    conn.query("select * from post", function(err, rows, fields){
        if(err) throw err;
        console.log(rows);
        res.render('list.ejs', {data : rows});
    });
    */
    
    //몽고DB
    mydb.collection('post').find().toArray().then(result=>{
        console.log(result);
        res.render('list.ejs', {data : result});
    })
    //res.sendFile(__dirname + '/list.ejs');
    
});

app.get('/enter', function(req, res){
    res.render('enter.ejs');
});

/*
app.post('/save', function(req,res){
    console.log(req.body.title);
    console.log(req.body.content);
    console.log(req.body.someDate);

    //몽고DB에 데이터 저장
    mydb.collection('post').insertOne(
        {title : req.body.title, content : req.body.content, date : req.body.someDate}
    ).then(result=>{
        console.log(result);
        console.log('데이터 추가 성공');
    });
    res.send('데이터 추가 성공');

    /*
    //MySQL DB에 데이터 저장
    let sql = "insert into post (title, content, created) values(?,?, NOW())";
    let params = [req.body.title, req.body.content, req.body.someDate];
    conn.query(sql, params, function (err, result){
        if(err) throw err;
        console.log('데이터 추가 성공');
    });
});
*/

app.post("/save", function(req, res){
    mydb
        .collection("post")
        .insertOne({
            title: req.body.title,
            content: req.body.content,
            date: req.body.someDate,
        })
        .then((result)=>{
            console.log(result);
            console.log("데이터 추가 성공");
        });
        res.redirect("/list");
});

app.post("/edit", function(req,res){
       console.log(req.body);
       req.body.id = new ObjId(req.body.id);
       mydb
           .collection("post")
           .updateOne({_id : req.body.id}, {$set : {title : req.body.title, content : 
               req.body.content, date : req.body.someDate}})
           .then((result)=> {
               console.log("수정 완료");
               res.redirect('/list');
           })
           .catch((err)=> {
               console.log(err);
           });
  });
    



app.post("/delete", function(req,res){
    console.log(req.body._id);
    req.body._id=new ObjId(req.body._id);
    mydb.collection('post').deleteOne(req.body)
    .then(result=>{
        console.log('삭제완료');
        res.status(200).send();
    })
    .catch(err=>{
        console.log(err);
        res.status(500).send();
    });
});

app.get('/content/:id', function(req,res){
    console.log(req.params.id);
    req.params.id = new ObjId(req.params.id);
    mydb
        .collection("post")
        .findOne({_id : req.params.id})
        .then((result)=>{
            console.log(result);
            res.render('content.ejs', {data : result});
        });
});

app.get("/edit/:id", function (req, res){
    req.params.id = new ObjId(req.params.id);
    mydb
        .collection("post")
        .findOne({_id : req.params.id})
        .then((result)=>{
            console.log(result);
            res.render('edit.ejs', {data : result});
        });
    });

    app.get("/login", function(req, res){
        console.log(req.session);
        if(req.session.user){
            console.log('세션 유지');
            res.render('index.ejs', {user : req.session.user});
        }
        else{
            res.render("login.ejs");
        }
    });

    app.post("/login", function(req,res){
        console.log("아이디 : " + req.body.userid);
        console.log("비밀번호 : " + req.body.userpw);

        mydb
        .collection("account")
        .findOne({userid:req.body.userid})
        .then((result)=>{
            if(result.userpw == sha(req.body.userpw)){
                req.session.user = req.body;
                console.log('새로운 로그인');
                res.render('index.ejs', {user : req.session.user});
            }
            else{
                res.render('login.ejs');
            }
        });
    });

    app.get("/logout", function(req, res){
        console.log("로그아웃");
        req.session.destroy();
        res.render('index.ejs', {user : null});
    });

    app.get("/signup", function(req, res) {
        res.render("signup.ejs");
    });

    app.post("/signup", function(req,res){
        console.log(req.body.userid);
        console.log(sha(req.body.userpw));
        console.log(req.body.usergroup);
        console.log(req.body.usermail);

        mydb
        .collection("account")
        .insertOne({
            userid : req.body.userid,
            userpw : sha(req.body.userpw),
            usergroup : req.body.usergroup,
            useremail : req.body.usermail,
        })
        .then((result)=> {
            console.log("회원가입 성공");
        });
        res.redirect("/");
    })