/**
 * bemtree-to-bemjson
 * =================
 *
 * Собирает *bemjson*-файл с помощью *bemtree* и *data.js*.
 *
 */
const dropRequireCache = require( 'enb/lib/fs/drop-require-cache' );

module.exports = require( 'enb/lib/build-flow' ).create()
    .name( 'bemtree-to-bemjson' )
    .target( 'target', '?.bemjson.js' )
    .useSourceFilename( 'bemtree', '?.bemtree.js' )
    .useSourceFilename( 'data', '?.data.js' )
    .builder( function ( bemtreeFilename, dataFilename ) {
        dropRequireCache( require, bemtreeFilename );
        dropRequireCache( require, dataFilename );

        const bemtree = require( bemtreeFilename ).BEMTREE;
        const data = require( dataFilename );
        const bemjson = JSON.stringify( bemtree.apply( { block : 'root', data : data } ), null, 4 );

        return `(${bemjson})`;
    } )
    .createTech();
