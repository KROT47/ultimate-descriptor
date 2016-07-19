
// TODO:
// 1. passing own properties to generator

/* --------------------------------- Required Modules --------------------------------- */

const Generator = require( 'abstract-value' )( 'Generator' );


/* ------------------------------ Module Exports ------------------------------ */

module.exports = Descriptor;

module.exports.get = GetDescriptor;

module.exports.extend = ExtendDescriptor;

module.exports.generator = Generator;

module.exports.cloneObject = CloneObject;

module.exports.toObject = DescriptorsToObject;

module.exports.replace = ReplaceAllInObject;


/* --------------------------------- Descriptor --------------------------------- */

/**
 * Abstract class to configure descriptor ( to get final descriptor use valueOf() )
 * @param (Descriptor|Object|undefined) descriptor - basic descriptor ( will be overwritten on set )
 * @param (Object|undefined) originObj - this object tells that for every property ( only if function ) in descriptor final property will be generated from this function using originObj
 * Function-generator looks like ( originDescriptor, originObj, originProp, objProp ) => {}
 * where originDescriptor is descriptor of originObj[ originProp ], and objProp is property name for descriptor in new object
 * @param (String|undefined) originProp - tells which property to take from originObj to generate ( use for( propName ) to redefine )
 * @return (Descriptor)
 */
function Descriptor( descriptor, originObj, originProp ) {
    if ( descriptor instanceof Descriptor ) return descriptor.for( originObj, originProp );

    if ( !( this instanceof Descriptor ) ) return new Descriptor( descriptor, originObj, originProp );

    this._init( descriptor, originObj, originProp );
}

Object.defineProperties( Descriptor.prototype, {

    /* ------------ Getters/Setters ------------- */
    
    // !Getters return final descriptor value ( to get raw value use getProp( propName, true ) )

    get:            getterDescriptor( 'get' ),

    set:            getterDescriptor( 'set' ),

    value:          getterDescriptor( 'value' ),

    writable:       getterDescriptor( 'writable' ),

    configurable:   getterDescriptor( 'configurable' ),

    enumerable:     getterDescriptor( 'enumerable' ),

    
    /* ------------ Methods ------------- */

    /**
     * Sets new obj property descriptor
     * @param (Object) obj - this object will acquire new property with current descriptor
     * @param (String|optional) objProp - property name
     * @return (Descriptor)
     */
    assignTo: {
        value: function ( obj, objProp ) {
            this.setObjProp( objProp );

            // if originObj is not defined - use obj
            if ( !this.getOriginObj() ) this.setOriginObj( obj );

            // if originProp is not defined - use objProp
            if ( !this.getOriginProp() ) this.setOriginProp( objProp );

            Object.defineProperty( obj, objProp, this.valueOf() );
            return this;
        }
    },

    /**
     * Sets originObj and originProp which generator will use
     * @param (Object|optional) originObj - origin object to extend from
     * @param (String|optional) originProp - origin object property name to extend from
     * @return (Descriptor)
     */
    for: {
        value: function ( originObj, originProp ) {
            var type = typeof originObj;

            if ( [ 'object', 'function' ].indexOf( type ) == -1 ) {
                originProp = originObj;
                originObj = null;
            }

            this.setOriginObj( originObj );
            this.setOriginProp( originProp );

            return this;
        }
    },

    /**
     * If proxy enabled originObj could be changed through it
     * Use when descriptor will be generated using originObj
     * By default origin objects wolud be cloned before generation process occures to prevent unexpected changes in originObj
     * @param (Boolean|optional) asProxy - default: true
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
     * @return (Descriptor)
     */
    setProp: {
        value: function ( prop, value ) {

            if ( value !== undefined ) {

                this.__descriptor[ prop ] = value;
                
                fixConflicts( this, prop );
            }

            return this;
        }
    },

    /**
     * Get final descriptor property if defined
     * @param (String) prop - property to get
     * @param (Boolean) rawValue - if true - no generation required ( default: false )
     * @return (Mixed|undefined)
     */
    getProp: {
        value: function ( prop, rawValue ) {
            return !rawValue && prop != '__proto__' && this._isGenerator( prop ) ?
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
            return !this.__unsafePropRegExp.test( prop ) && this.getProp( prop, true ) || undefined;
        }
    },

    /**
     * Returns global originObj or one for descriptor property if defined
     * @param (String|optional) prop
     * @return (Object|undefined)
     */
    getOriginObj: {
        value: function ( prop ) {
            return !prop && this._originObj
                    || this.getProp( prop, true ) && this.getProp( prop, true ).originObj
                    || undefined;
        }
    },

    /**
     * Defines global originObj or for one descriptor property if defined
     * @param (String|optional) prop
     * @param (Object) originObj
     * @return (Descriptor)
     */
    setOriginObj: {
        value: function ( prop, originObj ) {
            var type = typeof prop;

            if ( [ 'object', 'function' ].indexOf( type ) != -1 ) {
                originObj = prop;
                prop = null;
            }

            if ( originObj ) {
                if ( prop ) {
                    this.getProp( prop, true ).originObj = originObj;
                } else {
                    this._originObj = originObj;
                }
            }

            return this;
        }
    },

    /**
     * Returns global originObj property name or one for descriptor property if defined
     * @param (String|optional) prop
     * @return (String|undefined)
     */
    getOriginProp: {
        value: function ( prop ) {
            return !prop && this._originProp
                    || this.getProp( prop, true ) && this.getProp( prop, true ).originProp
                    || undefined;
        }
    },

    /**
     * Defines global originObj property name or for one descriptor property
     * @param (String|optional) prop
     * @param (String) originProp
     * @return (Descriptor)
     */
    setOriginProp: {
        value: function ( prop, originProp ) {
            if ( !originProp ) {
                originProp = prop;
                prop = null;
            }

            if ( originProp ) {
                if ( prop ) {
                    this.getProp( prop, true ).originProp = originProp;
                } else {
                    this._originProp = originProp;
                }
            }

            return this;
        }
    },

    /**
     * Returns objProp which is property name to which descriptor is assigned
     * @return (String|undefined)
     */
    getObjProp: { value: function () { return this._objProp } },

    /**
     * Defines objProp which is property name to which descriptor is assigned
     * @param (String) objProp
     * @return (Descriptor)
     */
    setObjProp: { value: function ( objProp ) { this._objProp = objProp } },


    /* ------------ Private ------------- */

    // _objProp - property name which this descriptor is assigned to
    // _asProxy - if true generators use origin object else cloned origin
    // _originObj - default origin object to use in generators
    // _originProp - default origin property name to use in generators

    // Returns final descriptor
    _generateDescriptor: {
        value: function () {
            var finalDescriptor = {};

            for ( var i in this.__descriptor ) finalDescriptor[ i ] = this.getProp( i );

            return finalDescriptor;
        }
    },

    // Tells if property value is generator function
    _isGenerator: {
        value: function ( prop ) { return this.getProp( prop, true ) instanceof Generator }
    },

    // Returns final property value from generator function
    _generateProp: {
        value: function ( prop ) {
            // if falsy value - just return
            if ( !this.__descriptor[ prop ] ) return this.__descriptor[ prop ];

            var originProp = this.getOriginProp( prop ) || this.getOriginProp(),
                objProp = this.getObjProp();

            if ( !originProp ) {
                throw Error( `originObj property name was not set for ${prop}. Try to use for() or setOriginProp()` );
            }
            if ( !objProp ) {
                throw Error( `Descriptor must be assigned to some object. use assignTo()` );
            }

            var originObj = this._getOriginObj( prop );

            if ( !originObj[ originProp ] ) {
                console.log( 'originObj:', originObj );
                throw Error( `originObj has no property '${originProp}'` );
            }

            var originDescriptor = GetDescriptor( originObj, originProp ),
                // originDescriptorProp = originDescriptor && originDescriptor[ prop ],
                generatorFunc = this.getProp( prop, true ).valueOf();

            return generatorFunc( originDescriptor, originObj, originProp, objProp );
        }
    },

    // returns originObj for descriptor property
    _getOriginObj: {
        value: function ( prop ) {
            var originObj = this.getOriginObj( prop ) || this.getOriginObj();

            return this._asProxy ? originObj : this._getObjClone( originObj );
        }
    },

    // returns obj clone ( from cache if able )
    _getObjClone: {
        value: function ( obj ) {
            var index;

            if ( !~( index = this.__clonedOriginObjs.indexOf( obj ) ) ) {
                // create and add clone to cache
                index = this.__clonedOriginObjs.length;

                this.__clonedOriginObjs.push( obj );

                this.__originObjsClones.push( CloneObject( obj ) );
            }

            return this.__originObjsClones[ index ];
        }
    },

    // first init
    _init: {
        value: function ( descriptor, originObj, originProp ) {

            var generator, i, allAsGenerators = false;

            this.__descriptor = descriptor || {};

            this.__clonedOriginObjs = []; // array of cloned objects
            this.__originObjsClones = []; // array of object clones

            if ( this.__descriptor instanceof Generator ) {
                generator = this.__descriptor;

                originObj = generator.originObj || originObj;
                originProp = generator.originProp || originProp;

                allAsGenerators = true;

                this.__descriptor = generator.valueOf();
            }

            this.setOriginObj( originObj );
            this.setOriginProp( originProp );

            if ( allAsGenerators ) {
                // convert all functions into generators
                for ( i in this.__descriptor ) {

                    generator = this.__descriptor[ i ];
                    
                    if ( !( generator instanceof Generator ) && typeof generator == 'function' ) {
                        this.__descriptor[ i ] = Generator( generator );
                    }
                }
            }

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
 * @param (Boolean) returnObject - if true Object will be returned else Descriptor
 * @return (Object|Descriptor|undefined)
 */
function GetDescriptor( obj, prop, returnObject ) {
    var descriptor;

    try {
        descriptor = Object.getOwnPropertyDescriptor( obj, prop );

        // look through all prototypes
        if ( descriptor === undefined && obj[ prop ] !== undefined ) {
            var proto = obj;

            while ( proto = proto.__proto__ ) {
                if ( descriptor = Object.getOwnPropertyDescriptor( proto, prop ) ) break;
            }
        }

    } catch ( e ) {}

    if ( descriptor === undefined ) return undefined;

    return returnObject ? descriptor : Descriptor( descriptor ).for( obj, prop );
}


/* --------------------------------- ExtendDescriptor --------------------------------- */

/**
 * Extends first descriptor with others
 * @param (Object|Descriptor) descriptor1, ...
 * @return (Object|Descriptor) - depends of first arguments item type
 */
function ExtendDescriptor() {
    for ( var i = arguments.length; i--; ) {
        if ( arguments[ i ] instanceof Descriptor ) return _extend.apply( null, arguments );
    }

    return _extendSimple.apply( null, arguments );
}

/**
 * Extends first descriptor with others ( instance of Descriptor )
 * @param (Object|Descriptor) descriptor1, ...
 * @return (Object|Descriptor) - depends of first arguments item type
 */
function _extend() {
    var result = Descriptor( arguments[ 0 ] ),
        descriptor, propName, prop, resultGeneratorConfigs;

    for ( var i = 1; i < arguments.length; ++i ) {

        descriptor = Descriptor( arguments[ i ] );
        
        for ( propName in descriptor ) if ( descriptor.getSafeProp( propName ) ) {

            prop = descriptor.getProp( propName, true );

            if ( prop === undefined && typeof descriptor[ propName ] == 'object' ) {
                // here we extend Descriptor complex private properties
                result[ propName ] = 
                    Object.assign(
                        Array.isArray( descriptor[ propName ] ) ? [] : {},
                        result[ propName ],
                        descriptor[ propName ]
                    );

            } else {
                result[ propName ] = prop;
            }
        }
    }

    return arguments[ 0 ] instanceof Descriptor ? result : arguments[ 0 ];
}

/**
 * Extends first descriptor with others ( not instance of Descriptor )
 * @param (Object) descriptor1, ...
 * @return (Object)
 */
function _extendSimple() {
    var result = arguments[ 0 ], descriptor, prop;

    for ( var i = 1; i < arguments.length; ++i ) {

        descriptor = arguments[ i ];

        for ( prop in descriptor ) {

            result[ prop ] = descriptor[ prop ];

            fixConflicts( result, prop );
        }
    }

    return result;
}


/* --------------------------------- Clone Object --------------------------------- */

/**
 * Returns object clone
 * @param (Object) obj
 * @return (Object)
 */
function CloneObject( obj ) {
    var descriptors = {}, props = Object.getOwnPropertyNames( obj );

    for ( var i = props.length; i--; ) {
        descriptors[ props[ i ] ] = Object.getOwnPropertyDescriptor( obj, props[ i ] );
    }

    return Object.create( Object.getPrototypeOf( obj ), descriptors );
}


/* --------------------------------- DescriptorsToObject --------------------------------- */

/**
 * Runs Object.defineProperties on new object and returns this object
 * @param (Object) propDescriptors
 * @return (Object)
 */
function DescriptorsToObject( propDescriptors ) {
    return Object.create( Object.prototype, propDescriptors );
}


/* --------------------------------- Generator Prototype --------------------------------- */

/**
 * Wraps object or function to tell about generator functions
 * @param (Object|Function) obj
 * generator function: function generator( originValue, objProp, originObj, originProp ) {}, where
 *      originValue - origin object property descriptor value for corresponding descriptor property
 *      objProp - property name of object to which this descriptor is assigned
 *      originObj - origin object
 *      originProp - origin object property name from which originValue was given
 * @return (Generator)
 */
// function Generator( obj ) {}

Object.defineProperties( Generator.prototype, {
    for: {
        value: function ( originObj, originProp ) {
            if ( typeof originObj != 'object' ) {
                originProp = originObj;
                originObj = undefined;
            }
            this.originObj = originObj;
            this.originProp = originProp;

            return this;
        }
    }
});


/* --------------------------------- ReplaceAllInObject --------------------------------- */

/**
 * Returns obj clone where needed obj descriptors are replaced with descriptors
 * @param (Boolean|undefined) deep - if true - deep replace of unreplaced objects ( if not in descriptors )
 * @param (Object) obj
 * @param (Array|Generator|Object) descriptors
 * e.g. [ { filter: (Function), descriptor: (Object|Generator) }, ..., descriptor ]
 *       - filter( prop, obj ) if returns true then its descriptor will be used else go for next
 *       - descriptor without filter will be used to all other properties
 * @return (Object)
 */
function ReplaceAllInObject( deep, obj, descriptors ) {
    if ( typeof deep == 'object' ) { descriptors = obj; obj = deep; deep = false }

    if ( !Array.isArray( descriptors ) ) descriptors = [ descriptors ];

    var newObj = {},
        props = Object.getOwnPropertyNames( obj ),
        prop, descriptor;

    for ( var i = props.length; i--; ) {
        prop = props[ i ];

        if ( descriptor = getDescriptor( descriptors, prop, obj ) ) {

            Descriptor( descriptor, obj, prop ).asProxy().assignTo( newObj, prop );

        } else if ( deep && getType( obj[ prop ] ) == 'Object' ) {

            newObj[ prop ] = ReplaceAllInObject( deep, obj[ prop ], descriptors );

        }
    }

    return newObj;
}
// returns needed descriptor
function getDescriptor( descriptors, prop, obj ) {

    for ( var i = 0; i < descriptors.length; ++i ) {
        if ( descriptors[ i ] instanceof Descriptor.generator ) return descriptors[ i ];

        if ( typeof descriptors[ i ].filter == 'function' ) {
            if ( descriptors[ i ].filter( prop, obj ) ) return descriptors[ i ].descriptor;
        } else {
            return descriptors[ i ];
        }
    }

    return false;
}


/* --------------------------------- Helpers --------------------------------- */

// returns obj type [ Array, Arguments, Object, Function, ... ]
function getType( obj ) {
    var dataType = toClass.call( obj );
    dataType = dataType.split( ' ' )[ 1 ];
    dataType = dataType.substring( 0, dataType.length - 1 );

    return dataType;
}
const toClass = Object.prototype.toString;


function getterDescriptor( prop ) {
    return {
        set: function ( value ) { this.setProp( prop, value ) },
        get: function () { return this.getProp( prop ) },
        enumerable: true
    }
}

// fixing descriptor properties conflicts after extend
function fixConflicts( descriptor, prop ) {
    if ( prop == 'value' ) {
        delete descriptor.get;
        delete descriptor.set;

    } else if ( prop == 'get' || prop == 'set' ) {
        delete descriptor.value;
        delete descriptor.writable;
    }
}