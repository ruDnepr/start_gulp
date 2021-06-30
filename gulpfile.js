let project_folder = require("path").basename(__dirname); //'dist';
let source_folder = 'src';

let fs = require('fs');

let path = {
    build: {
        html: project_folder + "/",
        css: project_folder + "/css/",
        js: project_folder + "/js/",
        img: project_folder + "/img/",
        fonts: project_folder + "/fonts/"
    },
    src: {
        html: [source_folder + "/*.html", "!" + source_folder + "/_*.html"],
        css: source_folder + "/scss/style.scss",
        js: source_folder + "/js/script.js",
        img: source_folder + "/img/**/*.{png,jpeg,jpg,gif,ico,svg,webp}",
        fonts: source_folder + "/fonts/**/*.ttf"
    },
    watch: {
        html: source_folder + "/**/*.html",
        css: source_folder + "/scss/**/*.scss",
        js: source_folder + "/js/**/*.js",
        img: source_folder + "/img/**/*.{png,jpeg,jpg,gif,ico,svg,webp}",
    },
    clean: "./" + project_folder + "/"
};

let { src, dest } = require('gulp'),
    gulp = require('gulp'),
    browsersync = require('browser-sync').create(),
    fileinclude = require('gulp-file-include'),
    del = require('del'),
    scss = require('gulp-sass')(require('sass')),
    autoprefixer = require('gulp-autoprefixer'),
    group_media = require('gulp-group-css-media-queries'),
    clean_css = require('gulp-clean-css'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify-es').default,
    imagemin = require('gulp-imagemin'),
    webp = require('gulp-webp'),
    webphtml = require("gulp-webp-html"),
    webpcss = require("gulp-webp-css"),
    svgSprite = require("gulp-svg-sprite"),
    ttf2woff = require("gulp-ttf2woff"),
    ttf2woff2 = require("gulp-ttf2woff2"),
    fonter = require("gulp-fonter");

function browserSync(params) {
    browsersync.init({
        server: {
            baseDir: "./" + project_folder + "/"
        },
        port: 3000,
        notify: true
    })
}

function buildHtml() {
    return src(path.src.html)
        .pipe(fileinclude())
        .pipe(webphtml())
        .pipe(dest(path.build.html))
        .pipe(browsersync.stream())
}

function buildScripts() {
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

function buildStyles() {
    return src(path.src.css)
        .pipe(
            scss({
                outputStyle: "expanded"
            })
        )
        .on("error", scss.logError)
        .pipe(group_media())
        .pipe(
            autoprefixer({
                overrideBrowserlist: ["last 5 versions"],
                cascade: true
            })
        )
        .pipe(webpcss()) //конвертирует webp  в css
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

function buildImages() {
    return src(path.src.img)
        //Сжатие картинок
        //webp - Интегрирует формат .webp только в те браузеры - которые поддерживают этот формат
        .pipe(
            webp({
                quality: 70 //Качество изображения
            })
        )
        .pipe(dest(path.build.img))
        .pipe(src(path.src.img))
        //после обработки webp сразу идет копирование обычных изображений
        //Ниже уже идет обработка обычных изображений
        .pipe(
            imagemin({
                progressive: true,
                interlaced: true,
                optimizationLevel: 3 //0 to 7 //Сила сжатия изображения
            })
        )
        .pipe(dest(path.build.img))
        .pipe(browsersync.stream())
}

function buildFonts() {
    src(path.src.fonts)
        .pipe(ttf2woff())
        .pipe(dest(path.build.fonts));

    return src(path.src.fonts)
        .pipe(ttf2woff2())
        .pipe(dest(path.build.fonts));
};

gulp.task('buildSvgSprite', function() {
    return gulp.src([source_folder + '/iconsprite/*.svg'])
        .pipe(
            svgSprite({
                mode: {
                    stack: {
                        sprite: "../icons/icong.svg",
                        //example: true
                    }
                }
            })
        )
        .pipe(dest(path.build.img))
})

//ЗАДАЧА для конвертирования OTF в TTF  (В исходной папке)
gulp.task('otf2ttf', function() {
    return src([source_folder + '/fonts/**/*.otf'])
        .pipe(fonter({
            formats: ['ttf']
        }))
        .pipe(dest(source_folder + '/fonts/'));
})

// === FUNCTION FOR IMPORTING THE FONTS INTO (S)CSS ===
function fontsStyle(params) {
    let fileContent = fs.readFileSync(source_folder + '/scss/fonts.scss');
    if (fileContent == '') {
        fs.writeFile(source_folder + '/scss/fonts.scss', '', cb);
        return fs.readdir(path.build.fonts, function(err, items) {
            if (items) {
                let cFontname;
                for (var i = 0; i < items.length; i++) {
                    let fontname = items[i].split('.');
                    fontname = fontname[0];
                    if (cFontname != fontname) {
                        fs.appendFile(source_folder + '/scss/fonts.scss', '@include font("' + fontname + '", "' + fontname + '", "400", "normal");\r\n', cb);
                    }
                    cFontname = fontname;
                }
            }
        })
    }
}

function cb() {

}

function watchFiles(params) {
    gulp.watch([path.watch.html], buildHtml);
    gulp.watch([path.watch.css], buildStyles);
    gulp.watch([path.watch.js], buildScripts);
    gulp.watch([path.watch.img], buildImages);
}

function clean(params) {
    return del(path.clean);
}

let build = gulp.series(clean, gulp.parallel(buildImages, buildScripts, buildStyles, buildHtml, buildFonts), fontsStyle);
let watch = gulp.parallel(build, watchFiles, browserSync);

exports.fontsStyle = fontsStyle;
exports.fonts = buildFonts;
exports.images = buildImages;
exports.js = buildScripts;
exports.css = buildStyles;
exports.html = buildHtml;
exports.build = build;
exports.watch = watch;
exports.default = watch;