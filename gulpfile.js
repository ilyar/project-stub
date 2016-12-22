const Builder = require('gulp-bem-bundle-builder');
const bundler = require('gulp-bem-bundler-fs');
const gulp = require('gulp');
const path = require('path');
const postcss = require('gulp-postcss');
const debug = require('gulp-debug');
const csso = require('gulp-csso');
const filter = require('through2-filter').obj;
const merge = require('merge2');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');
const bemhtml = require('gulp-bem-xjst').bemhtml;
const toHtml = require('gulp-bem-xjst').toHtml;

const fs = require('fs');
const mkdirp = require('mkdirp');
const bemtree = require('gulp-bem-xjst').bemtree;
const dropRequireCache = require('enb/lib/fs/drop-require-cache');
const bundleName = 'index';
const pathToBundle = path.join('desktop.bundles', bundleName);
const bemtreeFilename = path.resolve(pathToBundle, bundleName + '.bemtree.js');
const bemhtmlFilename = path.resolve(pathToBundle, bundleName + '.bemhtml.js');
const modelFilename = path.resolve('data', 'data.js');
const outputFolder = 'output';

const builder = Builder({
    levels: [
        'libs/bem-core/common.blocks',
        'libs/bem-core/desktop.blocks',
        'libs/bem-components/common.blocks',
        'libs/bem-components/desktop.blocks',
        'libs/bem-components/design/common.blocks',
        'libs/bem-components/design/desktop.blocks',
        'common.blocks',
        'desktop.blocks'
    ],
    techMap: {
        bemhtml: ['bemhtml.js'],
        js: ['vanilla.js', 'browser.js', 'js'],
        css: ['post.css', 'css']
    }
});

gulp.task('build', () => {
    return bundler('*.bundles/*')
        .pipe(builder({
            // cssdeps: bundle => bundle.src('css', {deps: true})
            //     .pipe(concat(bundle.name + '.css.deps.js')),
            // jsdeps: bundle => bundle.src('js', {deps: true})
            //     .pipe(concat(bundle.name + '.js.deps.js')),
            // bemhtmldeps: bundle => bundle.src('bemhtml', {deps: true})
            //     .pipe(concat(bundle.name + '.bemhtml.deps.js')),
            css: bundle =>
                bundle.src('css')
                    .pipe(require('gulp-one-of')())
                    .pipe(postcss([
                        require('postcss-import')(),
                        require('postcss-each'),
                        require('postcss-for'),
                        require('postcss-simple-vars')(),
                        require('postcss-calc')(),
                        require('postcss-nested'),
                        require('rebem-css'),
                        require('postcss-url')({ url: 'inline' }),
                        require('autoprefixer')({
                            browsers: ['ie >= 10', 'last 2 versions', 'opera 12.1', '> 2%']
                        }),
                        require('postcss-reporter')()
                    ]))
                    .pipe(concat(bundle.name + '.min.css'))
                    .pipe(csso()),
            js: bundle =>
                merge(
                    gulp.src(require.resolve('ym')),
                    bundle.src('js').pipe(filter(f => ~['vanilla.js', 'browser.js', 'js'].indexOf(f.tech))),
                    bundle.src('js').pipe(filter(file => file.tech === 'bemhtml.js'))
                        .pipe(concat('browser.bemhtml.js')).pipe(bemhtml())
                )
                    .pipe(uglify())
                    .pipe(concat(bundle.name + '.min.js')),
            tmpls: bundle =>
                bundle.src('bemhtml')
                    .pipe(concat('any.bemhtml.js'))
                    .pipe(bemhtml())
                    .pipe(concat(bundle.name + '.bemhtml.js')),
            bemtree: bundle =>
                bundle.src('bemtree.js')
                    .pipe(concat('any.bemtree.js'))
                    .pipe(bemtree())
                    .pipe(concat(bundle.name + '.bemtree.js')),
            html: bundle => {
                const bemhtmlApply = () => toHtml(bundle.target('tmpls'));
                return gulp.src(bundle.dirname + '/*.bemjson.js')
                    .pipe(bemhtmlApply());
            }
       }))
       .on('error', console.error)
       .pipe(debug())
       .pipe(gulp.dest(file => path.dirname(file.path)));
});

gulp.task('static', function() {
    return gulp
        .src('desktop.bundles/index/*.min.*')
        .pipe(gulp.dest(outputFolder));
});

gulp.task('generate', function(done) {
    dropRequireCache(require, bemtreeFilename);
    dropRequireCache(require, bemhtmlFilename);
    dropRequireCache(require, modelFilename);

    const model = require(modelFilename);
    const BEMTREE = require(bemtreeFilename);
    const BEMHTML = require(bemhtmlFilename);

    model.forEach(function(page) {
        const pageFolder = path.join(outputFolder, page.url);
        mkdirp.sync(pageFolder);
        fs.writeFileSync(path.join(pageFolder, 'index.html'), BEMHTML.apply(BEMTREE.apply({
            block: 'root',
            data: page
        })));
    });

    done();
});

gulp.task('default', gulp.series('build', 'generate'));
