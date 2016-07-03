
/* --------------------------------- Required Modules --------------------------------- */

const Extend = require( 'extend' );


/* ------------------------------ Module Exports ------------------------------ */

module.exports = Descriptor;

module.exports.get = GetDescriptor;

module.exports.extend = ExtendDescriptor;


/* --------------------------------- Descriptor --------------------------------- */

/**
 * Abstract class to configure descriptor ( to get final descriptor use valueOf() )
 * @param (Descriptor|Object|undefined) descriptor - basic descriptor ( will be overwritten on set )
 * @param (Object|undefined) originObj - this object tells that for every property ( only if function ) in descriptor final property will be generated from this function using originObj
 * Function-generator looks like ( originProp, originObj, propName ) => {}
 * where originProp is descriptor property value in originObj
 * @return (Descriptor)
 */
function Descriptor( descriptor, originObj ) {
	if ( descriptor instanceof Descriptor ) return descriptor.setOriginObj( originObj );

	if ( !( this instanceof Descriptor ) ) return new Descriptor( descriptor, originObj );

	this._init( descriptor, originObj );
}

Object.defineProperties( Descriptor.prototype, {

	/* ------------ Getters/Setters ------------- */
	
	// !Getters return not final value ( to get final value use getProp() )

	get: {
		set: function ( value ) { this.setProp( 'get', value ) },
		get: function () { return this.__descriptor.get },
		enumerable: true
	},

	set: {
		set: function ( value ) { this.setProp( 'set', value ) },
		get: function () { return this.__descriptor.set },
		enumerable: true
	},

	value: {
		set: function ( value ) { this.setProp( 'value', value ) },
		get: function () { return this.__descriptor.value },
		enumerable: true
	},

	writable: {
		set: function ( value ) { this.setProp( 'writable', value ) },
		get: function () { return this.__descriptor.writable },
		enumerable: true
	},

	configurable: {
		set: function ( value ) { this.setProp( 'configurable', value ) },
		get: function () { return this.__descriptor.configurable },
		enumerable: true
	},

	enumerable: {
		set: function ( value ) { this.setProp( 'enumerable', value ) },
		get: function () { return this.__descriptor.enumerable },
		enumerable: true
	},
	
	/* ------------ Methods ------------- */

	/**
	 * Sets new obj property descriptor
	 * @param (Object) obj - this object will aqquire new property with current descriptor
	 * @param (String|undefined) prop - property name
	 * @return (Descriptor)
	 */
	assignTo: {
		value: function ( obj, prop ) {
			this.for( prop );
			Object.defineProperty( obj, prop, this.valueOf() );
			return this;
		}
	},

	/**
	 * Sets property name for current descriptor
	 * @param (String) prop - property name
	 * @return (Descriptor)
	 */
	for: { value: function ( prop ) { if ( prop ) this._objPropName = prop; return this } },

	/**
	 * Use when descriptor was generated using originObj
	 * By default origin objects wolud be cloned before generation process occures to prevent unexpected changes in originObj
	 * But this method tells that we will change originObj anyway
	 * @param (Boolean|undefined) asProxy - default: true
	 * @return (Descriptor)
	 */
	asProxy: {
		value: function ( asProxy ) {
			this._asProxy = asProxy !== undefined ? asProxy : true;
			return this;
		}
	},

	/**
	 * Smart set descriptor property
	 * No need to delete unneeded properties, like value and get/set conflicts
	 * @param (String) prop - property to set
	 * @param (Mixed) value - property's new value
	 * @param (Object) originObj - this object tells that if value is a function then we consider that final property will be generated from this function using originObj
	 * @return (Descriptor)
	 */
	setProp: {
		value: function ( prop, value, originObj ) {

			if ( value !== undefined ) {

				if ( prop != '__proto__' ) this._addGenerator( prop, value, originObj );

				this.__descriptor[ prop ] = value;
				
				this._fixConflicts( prop );
			}

			return this;
		}
	},

	/**
	 * Get final descriptor property
	 * @param (String) prop - property to get
	 * @return (Mixed)
	 */
	getProp: {
		value: function ( prop ) {
			return prop != '__proto__' && this._isGenerator( prop ) ?
					this._generateProp( prop ) :
					this.__descriptor[ prop ];
		}
	},

	/**
	 * Extend this descriptor with others
	 * @param (Object|Descriptor) descriptor1, ...
	 * @return (Descriptor)
	 */
	extend: {
		value: function ( /* descriptor1, ... */ ) {
			var args = Array.prototype.slice.call( arguments );

			args.unshift( this );

			ExtendDescriptor.apply( null, args );

			return this;
		}
	},

	/**
	 * Returns originObj for descriptor property
	 * @param (String) prop
	 * @return (Object)
	 */
	getOriginObjFor: { value: function ( prop ) { return this._originObjs[ prop ] } },

	/**
	 * Returns final descriptor ( but better use assignTo() )
	 * @return (Object)
	 */
	valueOf: { value: function () { return this._generateDescriptor() } },

	/**
	 * Creates clone of this descriptor
	 * @return (Descriptor)
	 */
	clone: { value: function () { return Descriptor().extend( this ) } },

	/**
	 * Returns safe property value by name if defined ( safe means can be easily changed )
	 * @param (String)  prop
	 * @return (Mixed|undefined)
	 */
	getSafeProp: {
		value: function ( prop ) {
			return !this.__unsafePropRegExp.test( prop ) && this[ prop ] || undefined;
		}
	},

	/**
	 * Defines originObj for all generator functions
	 * @param (Object) originObj
	 * @return (Descriptor)
	 */
	setOriginObj: {
		value: function ( originObj ) {

			if ( originObj && this.__descriptor ) {
				for ( var i in this.__descriptor ) {
					this._addGenerator( i, this.__descriptor[ i ], originObj );
				}
			}

			return this;
		}
	},


	/* ------------ Private ------------- */
	
	// fixing properties conflicts
	_fixConflicts: {
		value: function ( prop ) {
			if ( prop == 'value' ) {
				delete this.__descriptor.get;
				delete this.__descriptor.set;

			} else if ( prop == 'get' || prop == 'set' ) {
				delete this.__descriptor.value;
				delete this.__descriptor.writable;
			}
		}
	},

	// Returns final descriptor
	_generateDescriptor: {
		value: function () {
			var finalDescriptor = {};

			for ( var i in this.__descriptor ) finalDescriptor[ i ] = this.getProp( i );

			return finalDescriptor;
		}
	},

	// Saves generator information
	_addGenerator: {
		value: function ( prop, value, originObj ) {
			if ( originObj && typeof value == 'function' ) this._originObjs[ prop ] = originObj;
		}
	},

	// Tells if property has generator function
	_isGenerator: {
		value: function ( prop ) { return this._originObjs[ prop ] !== undefined }
	},

	// Returns final property value from generator function
	_generateProp: {
		value: function ( prop ) {
			// if falsy value - just return
			if ( !this.__descriptor[ prop ] ) return this.__descriptor[ prop ];

			if ( !this._objPropName ) {
				throw Error( 'Property name was not set. Try to use Descriptor.for()' );
			}

			var originObj = this._getOriginObjFor( prop ),
				originDescriptor = Object.getOwnPropertyDescriptor( originObj, this._objPropName ),
				originDescriptorProp = originDescriptor && originDescriptor[ prop ];

			return this.__descriptor[ prop ]( originDescriptorProp, originObj, this._objPropName );
		}
	},

	// returns originObj or its clone for descriptor property
	_getOriginObjFor: {
		value: function ( prop ) {
			var originObj = this.getOriginObjFor( prop );

			if ( !this._asProxy ) {

				if ( this.__clonedOriginObjs[ originObj ] === undefined ) {
					this.__clonedOriginObjs[ originObj ] = Object.create( originObj );

					Extend( true, this.__clonedOriginObjs[ originObj ], originObj );
				}

				originObj = this.__clonedOriginObjs[ originObj ];
			}

			return originObj;
		}
	},

	// first init
	_init: {
		value: function ( descriptor, originObj ) {

			this.__descriptor = descriptor || {};
			this.__clonedOriginObjs = {};

			this._originObjs = {};

			this.setOriginObj( originObj );

			return this;
		}
	},

	// RegExp to detect safe property
	__unsafePropRegExp: { value: /^__/ }
});


/* --------------------------------- GetDescriptor --------------------------------- */

/**
 * Returns object property descriptor or defaultDescriptor if defined
 * @param (Object) obj
 * @param (String|Number) prop
 * @param (Object) defaultDescriptor
 * @return (Descriptor|undefined)
 */
function GetDescriptor( obj, prop, defaultDescriptor ) {
	var descriptor;

	try {
		descriptor = Object.getOwnPropertyDescriptor( obj, prop );
	} catch ( e ) {
		descriptor = defaultDescriptor;
	}

	return descriptor === undefined ? undefined : Descriptor( descriptor ).for( prop );
};


/* --------------------------------- ExtendDescriptor --------------------------------- */


/**
 * Extends first descriptor with others
 * @param (Object|Descriptor) descriptor1, ...
 * @return (Object|Descriptor) - depends of first arguments item type
 */
 function ExtendDescriptor() {
	var result = Descriptor( arguments[ 0 ] ),
		descriptor, prop;

	for ( var i = 1; i < arguments.length; ++i ) {

		descriptor = Descriptor( arguments[ i ] );

		for ( prop in descriptor ) if ( descriptor.getSafeProp( prop ) ) {
			if ( typeof descriptor[ prop ] == 'object' ) {
				result[ prop ] = 
					Extend(
						Array.isArray( descriptor[ prop ] ) ? [] : {},
						descriptor[ prop ]
					);
			} else {
				result[ prop ] = descriptor[ prop ];
			}
				 
		}
	}

	return arguments[ 0 ] instanceof Descriptor ? result : arguments[ 0 ];
};