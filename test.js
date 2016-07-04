
/* --------------------------------- Required Modules --------------------------------- */

const Descriptor = require( './' );


/* --------------------------------- Test Initialization --------------------------------- */

var originObj, newObj, newSimpleObj;

var descriptorWithValue, descriptorWithGetSet;

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

	descriptorWithValue = {
		value: Descriptor.generator( function ( originValue, objProp, originObj, originProp ) {
			return function () { return originValue.apply( originObj, arguments ) + ' world!' }
		}),
		configurable: true
	};

	descriptorWithGetSet = Descriptor.generator({
		get: function ( originGet, objProp, originObj, originProp ) {
			return function () { return originGet.call( originObj ) + ' world!' }
		},
		set: function ( originSet, objProp, originObj, originProp ) {
			return function ( value ) { originSet.call( originObj, value + ' mighty' ) }
		},
		configurable: function ( originConfigurable, objProp, originObj, originProp ) {
	      return originConfigurable !== undefined ? !originConfigurable : true
	    }
	});
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

	return descriptor.for( 'say' ).assignTo( newObj, 'talk' );

});

runTest( function ( descriptor ) {

	console.assert( newObj.talk() == 'Hello world!', 'Property was not generated properly' );
});

runTest( function ( descriptor ) {
	originObj._phrase = 'Goodbye';

	console.assert( newObj.talk() == 'Hello world!', 'Not proxied originObj influence generated property' );
});

runTest( function ( descriptor ) {
	newObj._phrase = 'Halo';

	console.assert( originObj.say() == 'Hello', 'Not proxied originObj influence generated property' );
});

/* ------------  ------------- */

runTest = TestSeries( function conditions() {
	
	var descriptor = new Descriptor();

	descriptor = Descriptor( descriptorWithGetSet, originObj )

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





console.log( 'Done!' );


var obj1 = { _phrase: 'Hello' },
    obj2 = { _phrase: 'Goodbye' };

Object.defineProperties( obj1, {
  say: { value: function () { return this.phrase } },

  phrase: {
    get: function () { return this._phrase },
    set: function ( value ) { this._phrase = value },
    configurable: true
  }
});


/* ------------ Simple usage ------------- */

var descriptor = Descriptor.get( obj1, 'phrase' );

console.log( obj2.phrase );           // undefined

descriptor.assignTo( obj2, 'phrase' );

console.log( obj2.phrase );           // Goodbye

descriptor
  .extend( { get: function () { return this._phrase + ' world!' } } )
  .extend( Descriptor( { set: function ( value ) { this._phrase = value + ' mighty' } } ) )
  .assignTo( obj2, 'phrase' );

console.log( obj2.phrase );           // Goodbye world!

obj2.phrase = 'Hello';

console.log( obj2.phrase );           // Hello mighty world!