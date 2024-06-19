const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { User } = require('./models/User');
const { Routine } = require('./models/routine');  // 루틴 모델 추가
const { auth } = require('./middleware/auth');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors());

app.use(express.static('public'));

const url = process.env.DB_URL;

mongoose.connect(url)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New client connected');
  ws.on('message', (message) => {
    console.log('Received:', message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/enter', (req, res) => {
  res.render('enter');
});

app.post('/enter', (req, res) => { });

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/api/users/register', async (req, res) => {
  const user = new User(req.body);
  try {
    await user.save();
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('회원가입 실패:', err);
    return res.status(400).json({ success: false, err: err.message });
  }
});

app.post('/api/users/checkDuplicate', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      res.json({ duplicate: true });
    } else {
      res.json({ duplicate: false });
    }
  } catch (error) {
    console.error('중복 확인 중 오류 발생:', error);
    res.status(500).json({ error: '서버 오류로 중복 확인에 실패했습니다.' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.json({
        loginSuccess: false,
        message: '이메일에 해당하는 유저가 없습니다.',
      });
    }

    const isMatch = await user.comparePassword(req.body.password);
    if (!isMatch) {
      return res.json({
        loginSuccess: false,
        message: '비밀번호가 틀렸습니다.',
      });
    }

    await user.generateToken();
    res.cookie('x_auth', user.token).status(200).json({ loginSuccess: true, userId: user._id });
  } catch (error) {
    console.error('로그인 중 오류 발생:', error);
    res.status(500).json({ loginSuccess: false, message: '로그인 중 오류가 발생했습니다.' });
  }
});

app.get('/api/users/auth', auth, (req, res) => {
  res.status(200).json({
    _id: req.user._id,
    isAdmin: req.user.role === 0 ? false : true,
    isAuth: true,
    email: req.user.email,
    name: req.user.name,
    lastname: req.user.lastname,
    role: req.user.role,
    image: req.user.image,
  });
});

app.get('/api/users/logout', auth, async (req, res) => {
  try {
    await User.findOneAndUpdate({ _id: req.user._id }, { token: '' });
    res.status(200).send({ success: true });
  } catch (err) {
    console.error('로그아웃 중 오류 발생:', err);
    res.status(500).json({ success: false, err: err.message });
  }
});

app.get('/api/hello', (req, res) => {
  res.send('안녕하세요~');
});

app.get('/chat', (req, res) => {
  res.render('chat');
});

app.get('/makeRoutine', (req, res) => {
  res.render('makeRoutine.ejs');
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const routineName = req.body.routineName;
    if (!routineName) {
      return cb(new Error('루틴 이름이 필요합니다.'));
    }
    const uploadPath = path.join(__dirname, 'fitner', 'uploads', routineName);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('파일이 업로드되지 않았습니다.');
  }

  const newImage = new Image({
    filename: req.file.filename,
    path: req.file.path,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });

  try {
    await newImage.save();
    res.send(`파일이 성공적으로 업로드되었습니다: ${req.file.filename}`);
  } catch (err) {
    console.error('파일을 데이터베이스에 저장하는 중 오류 발생:', err);
    res.status(500).send('파일을 데이터베이스에 저장하는 중 오류가 발생했습니다.');
  }
});

app.post('/createRoutine', upload.single('file'), async (req, res) => {
  const relatedLinks = req.body.relatedLinks ? JSON.parse(req.body.relatedLinks) : [];

  const routine = new Routine({
    name: req.body.routineName,
    equipment: req.body.equipment,
    time: req.body.time,
    description: req.body.description,
    link: relatedLinks,
    file: req.file ? req.file.filename : null
  });

  try {
    await routine.save();
    res.send('루틴이 성공적으로 생성되었습니다.');
  } catch (err) {
    console.error('루틴 생성 중 오류 발생:', err);
    res.status(500).send('루틴 생성 중 오류가 발생했습니다.');
  }
});

app.get('/routine', async (req, res) => {
  try {
    const routines = await Routine.find({});
    res.render('routine.ejs', { routines });
  } catch (err) {
    console.error('루틴 조회 중 오류 발생:', err);
    res.status(500).send('루틴 조회 중 오류가 발생했습니다.');
  }
});

app.get('/routine/:id', async (req, res) => {
  try {
    const routine = await Routine.findById(req.params.id);
    if (!routine) {
      return res.status(404).send('루틴을 찾을 수 없습니다.');
    }
    res.render('routineDetail.ejs', { routine });
  } catch (err) {
    console.error('루틴 조회 중 오류 발생:', err);
    res.status(500).send('루틴 조회 중 오류가 발생했습니다.');
  }
});

app.post('/uploadRoutine', upload.single('file'), (req, res) => {
  const routineName = req.body.routineName;
  const exerciseEquipment = req.body.exerciseEquipment;
  const exerciseTime = req.body.exerciseTime;
  const description = req.body.description;
  const linkText = req.body.linkText;

  console.log('Routine created:', {
    routineName,
    exerciseEquipment,
    exerciseTime,
    description,
    linkText,
    file: req.file
  });

  res.send('루틴이 성공적으로 생성되었습니다.');
});
