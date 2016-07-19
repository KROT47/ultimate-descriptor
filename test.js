
/* --------------------------------- Required Modules --------------------------------- */

const Descriptor = require( './' );


/* --------------------------------- Helpers --------------------------------- */

const toClass = Object.prototype.toString;
// returns obj type [ Array, Arguments, Object, Function, ... ]
function getType( obj ) {
    var dataType = toClass.call( obj );
    dataType = dataType.split( ' ' )[ 1 ];
    dataType = dataType.substring( 0, dataType.length - 1 );

    return dataType;
}


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
		value: Descriptor.generator( function ( originDescr, originObj, originProp, objProp ) {
			return function () { return originDescr.value.apply( originObj, arguments ) + ' world!' }
		}),
		configurable: true
	};

	descriptorWithGetSet = Descriptor.generator({
		get: function ( originDescr, originObj, originProp, objProp ) {
			return function () { return originDescr.get.call( originObj ) + ' world!' }
		},
		set: function ( originDescr, originObj, originProp, objProp ) {
			return function ( value ) { originDescr.set.call( originObj, value + ' mighty' ) }
		},
		configurable: function ( originDescr, originObj, originProp, objProp ) {
		  var originConfigurable = originDescr.configurable;
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


/* ---------------------------- ReplaceAllInObject Tests ---------------------------- */

var obj = Descriptor.toObject({
        _phrase: { value: 'Hello', writable: true },
        _say: { get: function () { return this._phrase } },
        say: { value: function () { return this._say } },

        child: {
            value: Descriptor.toObject({
                _phrase: { value: 'Hello' },
                _say: { get: function () { return this._phrase } },
                say: { value: function () { return this._say } },
            })
        }
    });


const descriptors = [
        {
            filter: function ( prop, obj ) {
                return /^_/.test( prop ) && Object.getOwnPropertyDescriptor( obj, prop ).get
            },
            descriptor: Descriptor.generator({
                get: function ( originDescr, originObj ) {
                    return function () {
                        return originDescr.get.apply( this, arguments ) + '!!!'
                    }
                }
            })
        }, {
            filter: function ( prop, obj ) {
                return typeof obj[ prop ] == 'function'
            },
            descriptor: Descriptor.generator({
                value: function ( originDescr, originObj ) {
                    return function () {
                        return '>>>' + originDescr.value.apply( this, arguments )
                    }
                },
                writable: true
            })
        }, {
            filter: function ( prop, obj ) { return getType( obj[ prop ] ) != 'Object' },
            descriptor: { value: 'Bye' }
        }
    ];

var newObj = Descriptor.replaceAllInObject( true, obj, descriptors );

console.assert( newObj._say == 'Bye!!!', 'Error 1' );
console.assert( newObj.say() == '>>>Bye!!!', 'Error 2' );

console.assert( newObj.child._say == 'Bye!!!', 'Deep Error 1' );
console.assert( newObj.child.say() == '>>>Bye!!!', 'Deep Error 2' );


console.log( 'Done!' );