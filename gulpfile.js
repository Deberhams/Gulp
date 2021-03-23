let project_folder = require('path').basename(__dirname); // Создаем главную папку с проектом, которую мы будем отдавать заказчику.
let source_folder = '#src'; // Добавляем папку с исходниками, на случай если мы хотим переименовать папку с исходниками.
let fs = require('fs'); //filesystem

// Содержит объекты которые будут содержать пути к папкам
let path = {
    // Будут хранится пути к файлам куда gulp будет выводить таски. Папка dist
    build: { // project_folder - папка с рабочим проектом
        html: project_folder+'/',
        css: project_folder+'/css/',
        js: project_folder+'/js/',
        img: project_folder+'/img/',
        fonts: project_folder+'/fonts/',
    },
    // Откуда gulp будет брать исходники для проекта. Папка #src
    src: { // source_folder - папка с исходниками
        html: [source_folder +'/*.html', "!" + source_folder +'/_*.html'],
        css: source_folder + '/sass/style.sass',
        js: source_folder+'/js/script.js',
        img: source_folder+'/img/**/*.{jpg,png,svg,gif,ico,webp}', // **/ - слушает все подпапки внутри img
        fonts: source_folder+'/fonts/*.ttf',
    },
    watch: { // Будет отслеживать изменения в файлах. Папка #
        // source_folder - папка с исходниками
        html: source_folder+'/**/*.html',
        css: source_folder + '/sass/**/*.sass',
        js: source_folder+'/js/**/*.js',
        img: source_folder+'/img/**/*.{jpg,png,svg,gif,ico,webp}', // **/ - слушает все подпапки внутри img
    },
    clean: './' + project_folder + '/'
}

let { src, dest } = require('gulp'),
    gulp = require('gulp'),
    browsersync = require('browser-sync').create(),
    fileinclude = require('gulp-file-include'),
    del = require('del'),
    sass = require('gulp-sass'),
    autoprefixer = require('gulp-autoprefixer'), // выставляет префиксы под разные браузеры
    group_media = require("gulp-group-css-media-queries"),
    clean_css = require("gulp-clean-css"),
    rename = require("gulp-rename"),
    uglify = require("gulp-uglify-es").default,
    imagemin = require("gulp-imagemin"),
    webp = require('gulp-webp'),
    webphtml = require('gulp-webp-html'),
    webpcss = require('gulp-webpcss'),
    svgSprite = require('gulp-svg-sprite'),
    ttf2woff = require('gulp-ttf2woff'),
    ttf2woff2 = require('gulp-ttf2woff2'),
    fonter = require('gulp-fonter');


// Функция создает локальный сервер на подобии LiveServer
function browserSync(params) {
    browsersync.init({
        server: {
            baseDir: './' + project_folder + '/'
        },
        port: 3000,
        notify: false
    })
}

// Функция для дублирования исходника в проект
function html() {
    return src(path.src.html)
    .pipe(fileinclude())
    .pipe(webphtml())
    .pipe(dest(path.build.html))
    .pipe(browsersync.stream())
}

// Функция для дублирования исходника в проект CSS
function css() {
    return src(path.src.css)
    .pipe(
        sass({
            outputStyle: "expanded"
        })
    )
    .pipe(
        group_media({
        })
    )
    .pipe(
        autoprefixer({
            overrideBrowserslist: ["last 5 versions"],
            cascade: true
        })
    )
    .pipe(webpcss())
    .pipe(dest(path.build.css))
    .pipe(clean_css())
    .pipe(
        rename({
            extname: ".min.css"
        })
    )
    .pipe(dest(path.build.css))
    .pipe(browsersync.stream())
}

// Функция позволяет дублировать JS в папку dist, а также использование миксина @incude
function js() {
    return src(path.src.js)
    .pipe(fileinclude())
    .pipe(dest(path.build.js))
    .pipe(
        uglify()
    )
    .pipe(
        rename({
            extname: ".min.js"
        })
    )
    .pipe(dest(path.build.js))
    .pipe(browsersync.stream())
}

// Функция для сжатия картинок
function images() {
    return src(path.src.img)
    .pipe(
        webp({
            quality: 70
        })
    )
    .pipe(dest(path.build.img))
    .pipe(src(path.src.img))
    .pipe(
        imagemin({
            progressive: true,
            svgoPlugins: [{ removeViewBox: false }],
            interlaced: true,
            optimizationLevel: 3 // 0 to 7 как сильно хотим сжимать изобр.
        })
    )
    .pipe(dest(path.build.img))
    .pipe(browsersync.stream())
}

function fonts() {
    src(path.src.fonts)
        .pipe(ttf2woff())
        .pipe(dest(path.build.fonts));
    return src(path.src.fonts) 
        .pipe(ttf2woff2())
        .pipe(dest(path.build.fonts));   
}

// Функция для конвертирования
// Запускается отдельно как 
gulp.task('otf2ttf', function() {
    return src([source_folder + '/fonts/*.otf'])
    .pipe(fonter({
        formats: ['ttf']
    }))
    .pipe(dest(source_folder + '/fonts/'));
})


// Запускается отдельно в терминале gulp svgSprite
// Функция для выполнение задачи (Выполняется в терминале)
// Смотреть на сайте: https://www.npmjs.com/search?q=gulp-svg-sprite
gulp.task('svgSprite', function(){
    return gulp.src([source_folder + '/iconsprite/*.svg'])
    .pipe(svgSprite({
        mode: {
            stack: {
                sprite: "../icons/icons.svg", // Sprite file name
                example: true //Создает html файл с примерами иконок 
            }
        },
    }
    ))
    .pipe(dest(path.build.img))
})


// Функция записывает имена файлов конвертированных шрифтов в файл fonts
function fontsStyle(params) {
    let file_content = fs.readFileSync(source_folder + '/sass/fonts.sass');
    if (file_content == '') {
        fs.writeFile(source_folder + '/sass/fonts.sass', '', cb);
        return fs.readdir(path.build.fonts, function (err, items) {
            if (items) {
                let c_fontname;
                for (var i = 0; i < items.length; i++) {
                    let fontname = items[i].split('.');
                    fontname = fontname[0];
                    if (c_fontname != fontname) {
                        fs.appendFile(source_folder + '/sass/fonts.sass', '@include font("' + fontname + '", "' + fontname + '", "400", "normal")\r\n', cb);
                    }
                    c_fontname = fontname;
                }
            }
        })
    }
}

function cb() {

}

// Функция слежки за файлами. На случай если мы напишем новое в файле.
function watchFiles(params) {
    gulp.watch([path.watch.html], html);
    gulp.watch([path.watch.css], css);
    gulp.watch([path.watch.js], js);
    gulp.watch([path.watch.img], images);
}

// Функция чистит папку dist
function clean(params) {
    return del(path.clean);
}

// Сценарий выполнения задач.
let build = gulp.series(clean, gulp.parallel(js, css, html, images, fonts), fontsStyle);
let watch = gulp.parallel(build, watchFiles, browserSync);


// Роднит файлы

exports.fonfontsStyle =fontsStyle;
exports.fonts = fonts;
exports.images = images;
exports.js = js;
exports.css = css;
exports.html = html;
exports.build = build;
exports.watch = watch;
exports.default = watch;