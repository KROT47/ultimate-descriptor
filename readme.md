# UltimateDescriptor

Adds cool features to working with descriptor  
Allows to create object connections of high complexity using generators

**Usage:**

```js
const Descriptor = require( 'ultimate-descriptor' );

/* ------------ Tools ------------- */

// returns new Descriptor object
// Descriptor( {descriptor:Object|Descriptor}[, {originObj:Object}, {originProp:String}] ) => {Descriptor}

// extracts descriptor form object
// Descriptor.get( {obj:Object}, {prop:String}[, {returnDescriptor:Boolean}] ) => {Object|Descriptor|undefined}

// extends descriptor with others
// Descriptor.extend( {descriptor1:Object|Descriptor}[, ...] ) => {Object|Descriptor}

// converts object with property descriptors to result object
// Descriptor.toObject( {propDescriptors:Object} ) => {Object}

// Returns object clone where all properties are defined via origin object's descriptors
// Descriptor.clone( {obj:Object} ) => {Object}

// returns generator constructor
// Descriptor.generator( {generatorFunc:Function} ) => {Generator}

// Returns new object with replaced descriptors
// Descriptor.replaceAllInObject( [{deep:Boolean},] {obj:Object}, {descriptors:Array|Generator|Object} )
// to set filtering on which descriptor to use try this:
// descriptors = [ { filter: function ( prop, obj ) { return prop == 'test' }, descriptor: YourDescr } ]


/* ------------ Example vars ------------- */

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

// var result = Descriptor.extend( descriptor1, descriptor2 ); // result === descriptor1


/* ------------ Advanced usage ------------- */

// Descriptor.generator is used to generate final descriptor value using some function and originObj
// Descriptor.generator can be used on whole descriptor or on any property

var valueSayDescriptor = {
    value: Descriptor.generator( function ( originDescr, originObj, originProp, objProp ) {
      return function () { return originDescr.value.apply( originObj, arguments ) + ' world!' }
    }).for( 'say' ), // defining descriptor generator using property 'say' of some object
    configurable: true
  },
  getSetDescriptor = Descriptor.generator( {
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

// e.g. we want to connect obj2.whisper() with obj1.say() using generator
var descriptor = Descriptor( valueSayDescriptor, obj1 );

descriptor.assignTo( obj2, 'whisper' );

console.log( obj2.whisper() );          // Hello world!

// now lets use obj1.phrase in generator using Proxy
// with proxy changing obj2 will change obj1 and vice versa
// they become connected via descriptor generators
var descriptor = Descriptor( getSetDescriptor ).for( obj1, 'phrase' );

descriptor.asProxy().assignTo( obj2, 'phrase' );

console.log( obj1.phrase );           // Hello

obj2.phrase = 'Hi';

console.log( obj1.phrase );           // Hi mighty
console.log( obj2.phrase );           // Hi mighty world!


var obj3 = {};

// asProxy() here is not necessary it is still set to true from previous time
// to disable proxy use asProxy( false )
descriptor.for( obj2, 'phrase' ).asProxy().assignTo( obj3, 'phrase' );

console.log( obj1.phrase );           // Hi mighty
console.log( obj2.phrase );           // Hi mighty world!
console.log( obj3.phrase );           // Hi mighty world! world!

// now we can see how all these objects are connected
obj3.phrase = 'Oh no';

console.log( obj1.phrase );           // Oh no mighty mighty
console.log( obj2.phrase );           // Oh no mighty mighty world!
console.log( obj3.phrase );           // Oh no mighty mighty world! world!
```