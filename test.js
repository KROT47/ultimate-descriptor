
/* --------------------------------- Required Modules --------------------------------- */

const Descriptor = require( './' );


/* --------------------------------- Test Initialization --------------------------------- */

var originObj, newObj, newSimpleObj;

var descriptorWithValue, descriptorWithGetSet;
// var simpleDescriptor;
var runTest;

function initTest() {
	originObj = {
		_phrase: 'Hello',
		say: function () { return this.phrase }
	};

	Object.defineProperties( originObj, {
		phrase: {
			get: function () { return this._phrase },
			set: function ( value ) { this._phrase = value }
		}
	});

	newObj = {};
	// newSimpleObj = {};

	// simpleDescriptor = { value: function () { return ' world!' } };

	descriptorWithValue = {
		value: function ( originValue, originObj, propName ) {
			return function () { return originValue.apply( originObj, arguments ) + ' world!' }
		}
	};

	descriptorWithGetSet = {
		get: function ( originGet, originObj, propName ) {
			return function () { return originGet.call( originObj ) + ' world!' }
		},
		set: function ( originSet, originObj, propName ) {
			return function ( value ) { originSet.call( originObj, value + ' mighty' ) }
		}
	};
}


/* --------------------------------- Tests Constructor --------------------------------- */

function TestSeries( conditions ) {
	return function ( test ) {
		initTest();
		test( conditions() );
	}
}


/* --------------------------------- Tests --------------------------------- */

runTest = TestSeries( function conditions() {
	var descriptor = Descriptor( descriptorWithValue, originObj );

	return descriptor.assignTo( newObj, 'say' );

});


runTest( function ( descriptor ) {
	console.assert( newObj.say() == 'Hello world!', 'Property was not generated properly' );
});

runTest( function ( descriptor ) {
	originObj._phrase = 'Goodbye';

	console.assert( newObj.say() == 'Hello world!', 'Not proxied originObj influence generated property' );
});

runTest( function ( descriptor ) {
	newObj._phrase = 'Halo';

	console.assert( originObj.say() == 'Hello', 'Not proxied originObj influence generated property' );
});

/* ------------  ------------- */

runTest = TestSeries( function conditions() {
	
	var descriptor = new Descriptor();

	descriptor.setProp( 'get', descriptorWithGetSet.get, originObj );
	descriptor.setProp( 'set', descriptorWithGetSet.set, originObj );
	// or equal: descriptor = Descriptor( descriptorWithGetSet, originObj )

	return descriptor.asProxy().assignTo( newObj, 'phrase' );
});

runTest( function ( descriptor ) {
	originObj._phrase = 'Goodbye';

	console.assert( newObj.phrase == 'Goodbye world!', 'Proxied originObj does not influence generated property' );
});

runTest( function ( descriptor ) {
	newObj.phrase = 'Halo';

	console.assert( originObj._phrase == 'Halo mighty', 'Proxied descriptor does not affects originObj' );
});

runTest( function ( descriptor ) {
	console.assert( newObj.phrase == 'Hello world!', 'Generation for get property failed' );
});

runTest( function ( descriptor ) {
	var clone = descriptor.clone();

	check( descriptor, clone );
	check( clone, descriptor );

	function check( obj, clone, innerLoop ) {
		for ( var i in clone ) {
			if ( typeof clone[ i ] == 'object' ) {
				if ( innerLoop ) {
					console.assert( obj[ i ] === clone[ i ], 'Cloning failed', obj[ i ], clone[ i ] );
				} else {
					check( obj[ i ], clone[ i ], true );
				}
			} else {
				console.assert( obj[ i ] == clone[ i ], 'Cloning failed', obj[ i ], clone[ i ] );
			}
		}
	}
});

// t = Descriptor({
// 	get: function ( baseGet, obj ) {
// 		return function () {
// 			return 123;
// 		}
// 	}
// });
// console.log(t.get.toString());
// console.log(t.getProp( 'get' ).toString());
// console.log(t.__proto__);
// console.log(t.getProp( '__proto__' ));
// t.setProp( '__proto__', { a: 123 } );
// console.log(t.getProp( '__proto__' ));

console.log( 'Done!' );