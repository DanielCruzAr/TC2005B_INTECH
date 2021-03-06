const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const session = require('express-session');
const logger = require('morgan');
const csrf = require('csurf');
const flash = require('connect-flash');
const contextInit = require('./utils/context_manager');

const dashboardRouter = require('./routes/dashboard');
const loginRouter = require('./routes/login');
const proyectoXRouter = require('./routes/proyectoX');
const proyectosRouter = require('./routes/proyectos');
const profileRouter = require('./routes/profile');
const { error } = require('console');

const app = express();

// view engine setup
app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('tiny'));

app.use(session({
    secret: 'lafdkansldfa',
    resave: false, //La sesión no se guardará en cada petición, sino sólo se guardará si algo cambió 
    saveUninitialized: false, //Asegura que no se guarde una sesión para una petición que no lo necesita
}));
app.use(flash());

const csrfProtection = csrf();
app.use(csrfProtection);

app.use('/login', loginRouter);
app.use('/proyecto', proyectoXRouter);
app.use('/proyectos', proyectosRouter);
app.use('/profile', profileRouter);
app.use('/', dashboardRouter);

app.use(async (request, response, next) => {
    let context = await contextInit('Error 404', request);
    response.status(404);
    response.render('error404', context);

})

//module.exports = app;
app.listen(8080);