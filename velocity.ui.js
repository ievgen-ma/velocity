/**********************
 Velocity UI Pack
 **********************/

/* VelocityJS.org UI Pack (5.2.0). (C) 2014 Julian Shapiro. MIT @license: en.wikipedia.org/wiki/MIT_License. Portions copyright Daniel Eden, Christian Pucci. */

(function (factory) {
    "use strict";
    /* CommonJS module. */
    if (typeof require === "function" && typeof exports === "object") {
        module.exports = factory();
        /* AMD module. */
    } else if (typeof define === "function" && define.amd) {
        define(["velocity"], factory);
        /* Browser globals. */
    } else {
        factory();
    }
}(function () {
    "use strict";
    return function (global, window, document, undefined) {

        /*************
         Checks
         *************/
        var Velocity = global.Velocity;

        if (!Velocity || !Velocity.Utilities) {
            if (window.console) {
                console.log("Velocity UI Pack: Velocity must be loaded first. Aborting.");
            }
            return;
        }
        var $ = Velocity.Utilities;

        var velocityVersion = Velocity.version,
            requiredVersion = { major: 1, minor: 1, patch: 0 };

        function greaterSemver(primary, secondary) {
            var versionInts = [];

            if (!primary || !secondary) {
                return false;
            }

            $.each([primary, secondary], function (i, versionObject) {
                var versionIntsComponents = [];

                $.each(versionObject, function (component, value) {
                    while (value.toString().length < 5) {
                        value = "0" + value;
                    }
                    versionIntsComponents.push(value);
                });

                versionInts.push(versionIntsComponents.join(""));
            });

            return (parseFloat(versionInts[0]) > parseFloat(versionInts[1]));
        }

        if (greaterSemver(requiredVersion, velocityVersion)) {
            var abortError = "Velocity UI Pack: You need to update Velocity (velocity.js) to a newer version. Visit http://github.com/julianshapiro/velocity.";
            alert(abortError);
            throw new Error(abortError);
        }

        /************************
         Effect Registration
         ************************/

        /* Note: RegisterUI is a legacy name. */
        Velocity.RegisterEffect = Velocity.RegisterUI = function (effectName, properties) {
            /* Animate the expansion/contraction of the elements' parent's height for In/Out effects. */
            function animateParentHeight(elements, direction, totalDuration, stagger) {
                var totalHeightDelta = 0,
                    parentNode;

                /* Sum the total height (including padding and margin) of all targeted elements. */
                $.each(elements.nodeType ? [elements] : elements, function (i, element) {
                    if (stagger) {
                        /* Increase the totalDuration by the successive delay amounts produced by the stagger option. */
                        totalDuration += i * stagger;
                    }

                    parentNode = element.parentNode;

                    var propertiesToSum = ["height", "paddingTop", "paddingBottom", "marginTop", "marginBottom"];

                    /* If box-sizing is border-box, the height already includes padding and margin */
                    if (Velocity.CSS.getPropertyValue(element, "boxSizing").toString().toLowerCase() === "border-box") {
                        propertiesToSum = ["height"];
                    }

                    $.each(propertiesToSum, function (i, property) {
                        totalHeightDelta += parseFloat(Velocity.CSS.getPropertyValue(element, property));
                    });
                });

                /* Animate the parent element's height adjustment (with a varying duration multiplier for aesthetic benefits). */
                Velocity.animate(
                    parentNode, { height: (direction === "In" ? "+" : "-") + "=" + totalHeightDelta }, { queue: false, easing: "ease-in-out", duration: totalDuration * (direction === "In" ? 0.6 : 1) }
                );
            }

            /* Register a custom redirect for each effect. */
            Velocity.Redirects[effectName] = function (element, redirectOptions, elementsIndex, elementsSize, elements, promiseData, loop) {
                var finalElement = (elementsIndex === elementsSize - 1),
                    totalDuration = 0;

                loop = loop || properties.loop;
                if (typeof properties.defaultDuration === "function") {
                    properties.defaultDuration = properties.defaultDuration.call(elements, elements);
                } else {
                    properties.defaultDuration = parseFloat(properties.defaultDuration);
                }

                /* Get the total duration used, so we can share it out with everything that doesn't have a duration */
                for (var callIndex = 0; callIndex < properties.calls.length; callIndex++) {
                    durationPercentage = properties.calls[callIndex][1];
                    if (typeof durationPercentage === "number") {
                        totalDuration += durationPercentage;
                    }
                }
                var shareDuration = totalDuration >= 1 ? 0 : properties.calls.length ? (1 - totalDuration) / properties.calls.length : 1;

                /* Iterate through each effect's call array. */
                for (callIndex = 0; callIndex < properties.calls.length; callIndex++) {
                    var call = properties.calls[callIndex],
                        propertyMap = call[0],
                        redirectDuration = 1000,
                        durationPercentage = call[1],
                        callOptions = call[2] || {},
                        opts = {};

                    if (redirectOptions.duration !== undefined) {
                        redirectDuration = redirectOptions.duration;
                    } else if (properties.defaultDuration !== undefined) {
                        redirectDuration = properties.defaultDuration;
                    }

                    /* Assign the whitelisted per-call options. */
                    opts.duration = redirectDuration * (typeof durationPercentage === "number" ? durationPercentage : shareDuration);
                    opts.queue = redirectOptions.queue || "";
                    opts.easing = callOptions.easing || "ease";
                    opts.delay = parseFloat(callOptions.delay) || 0;
                    opts.loop = !properties.loop && callOptions.loop;
                    opts._cacheValues = callOptions._cacheValues || true;

                    /* Special processing for the first effect call. */
                    if (callIndex === 0) {
                        /* If a delay was passed into the redirect, combine it with the first call's delay. */
                        opts.delay += (parseFloat(redirectOptions.delay) || 0);

                        if (elementsIndex === 0) {
                            opts.begin = function () {
                                /* Only trigger a begin callback on the first effect call with the first element in the set. */
                                if (redirectOptions.begin) {
                                    redirectOptions.begin.call(elements, elements);
                                }

                                var direction = effectName.match(/(In|Out)$/);

                                /* Make "in" transitioning elements invisible immediately so that there's no FOUC between now
                                 and the first RAF tick. */
                                if ((direction && direction[0] === "In") && propertyMap.opacity !== undefined) {
                                    $.each(elements.nodeType ? [elements] : elements, function (i, element) {
                                        Velocity.CSS.setPropertyValue(element, "opacity", 0);
                                    });
                                }

                                /* Only trigger animateParentHeight() if we're using an In/Out transition. */
                                if (redirectOptions.animateParentHeight && direction) {
                                    animateParentHeight(elements, direction[0], redirectDuration, redirectOptions.stagger);
                                }
                            };
                        }

                        /* If the user isn't overriding the display option, default to "auto" for "In"-suffixed transitions. */
                        if (redirectOptions.display !== null) {
                            if (redirectOptions.display !== undefined && redirectOptions.display !== "none") {
                                opts.display = redirectOptions.display;
                            } else if (/In$/.test(effectName)) {
                                /* Inline elements cannot be subjected to transforms, so we switch them to inline-block. */
                                var defaultDisplay = Velocity.CSS.Values.getDisplayType(element);
                                opts.display = (defaultDisplay === "inline") ? "inline-block" : defaultDisplay;
                            }
                        }

                        if (redirectOptions.visibility && redirectOptions.visibility !== "hidden") {
                            opts.visibility = redirectOptions.visibility;
                        }
                    }

                    /* Special processing for the last effect call. */
                    if (callIndex === properties.calls.length - 1) {
                        /* Append promise resolving onto the user's redirect callback. */
                        var injectFinalCallbacks = function () {
                            if ((redirectOptions.display === undefined || redirectOptions.display === "none") && /Out$/.test(effectName)) {
                                $.each(elements.nodeType ? [elements] : elements, function (i, element) {
                                    Velocity.CSS.setPropertyValue(element, "display", "none");
                                });
                            }
                            if (redirectOptions.complete) {
                                redirectOptions.complete.call(elements, elements);
                            }
                            if (promiseData) {
                                promiseData.resolver(elements || element);
                            }
                        };

                        opts.complete = function () {
                            if (loop) {
                                Velocity.Redirects[effectName](element, redirectOptions, elementsIndex, elementsSize, elements, promiseData, loop === true ? true : Math.max(0, loop - 1));
                            }
                            if (properties.reset) {
                                for (var resetProperty in properties.reset) {
                                    if (!properties.reset.hasOwnProperty(resetProperty)) {
                                        continue;
                                    }
                                    var resetValue = properties.reset[resetProperty];

                                    /* Format each non-array value in the reset property map to [ value, value ] so that changes apply
                                     immediately and DOM querying is avoided (via forcefeeding). */
                                    /* Note: Don't forcefeed hooks, otherwise their hook roots will be defaulted to their null values. */
                                    if (Velocity.CSS.Hooks.registered[resetProperty] === undefined && (typeof resetValue === "string" || typeof resetValue === "number")) {
                                        properties.reset[resetProperty] = [properties.reset[resetProperty], properties.reset[resetProperty]];
                                    }
                                }

                                /* So that the reset values are applied instantly upon the next rAF tick, use a zero duration and parallel queueing. */
                                var resetOptions = { duration: 0, queue: false };

                                /* Since the reset option uses up the complete callback, we trigger the user's complete callback at the end of ours. */
                                if (finalElement) {
                                    resetOptions.complete = injectFinalCallbacks;
                                }

                                Velocity.animate(element, properties.reset, resetOptions);
                                /* Only trigger the user's complete callback on the last effect call with the last element in the set. */
                            } else if (finalElement) {
                                injectFinalCallbacks();
                            }
                        };

                        if (redirectOptions.visibility === "hidden") {
                            opts.visibility = redirectOptions.visibility;
                        }
                    }

                    Velocity.animate(element, propertyMap, opts);
                }
            };

            /* Return the Velocity object so that RegisterUI calls can be chained. */
            return Velocity;
        };

        /*********************
         Packaged Effects
         *********************/

        /* Externalize the packagedEffects data so that they can optionally be modified and re-registered. */
        /* Support: <=IE8: Callouts will have no effect, and transitions will simply fade in/out. IE9/Android 2.3: Most effects are fully supported, the rest fade in/out. All other browsers: full support. */
        Velocity.RegisterEffect.packagedEffects = {
            /* Animate.css */
            "zoomIn": {
                defaultDuration: 3000,
                calls: [
                    [{ scale: 1.2 }, 1]
                ]
            },
            "zoomOut": {
                defaultDuration: 3000,
                calls: [
                    [{ scale: 0.8 }, 1]
                ]
            },
            "callout.bounce": {
                defaultDuration: 550,
                calls: [
                    [{ translateY: -30 }, 0.25],
                    [{ translateY: 0 }, 0.125],
                    [{ translateY: -15 }, 0.125],
                    [{ translateY: 0 }, 0.25]
                ]
            },
            /* Animate.css */
            "callout.shake": {
                defaultDuration: 800,
                calls: [
                    [{ translateX: -11 }, 0.1],
                    [{ translateX: 11 }, 0.1],
                    [{ translateX: -11 }, 0.1],
                    [{ translateX: 11 }, 0.1],
                    [{ translateX: -11 }, 0.1],
                    [{ translateX: 11 }, 0.1],
                    [{ translateX: -11 }, 0.1],
                    [{ translateX: 0 }, 0]
                ]
            },
            /* Animate.css */
            "callout.flash": {
                defaultDuration: 1100,
                calls: [
                    [{ opacity: 0 }, 1, { easing: "easeInOutQuad" }],
                    [{ opacity: 1 }, 1, { easing: "easeInOutQuad" }],
                ]
            },
            /* Animate.css */
            "callout.pulse": {
                defaultDuration: 825,
                calls: [
                    [{ scale: 1.1 }, 0.50, { easing: "easeInExpo" }],
                    [{ scale: 1 }, 0.50]
                ]
            },
            /* Animate.css */
            "callout.swing": {
                defaultDuration: 950,
                calls: [
                    [{ rotateZ: 15 }, 0.2],
                    [{ rotateZ: -10 }, 0.2],
                    [{ rotateZ: 5 }, 0.2],
                    [{ rotateZ: -5 }, 0.2],
                    [{ rotateZ: 0 }, 0.2]
                ]
            },
            /* Animate.css */
            "callout.tada": {
                defaultDuration: 1000,
                calls: [
                    [{ scale: 0.9, rotateZ: -3 }, 0.10],
                    [{ scale: 1.1, rotateZ: 3 }, 0.10],
                    [{ scale: 1.1, rotateZ: -3 }, 0.10],
                    ["reverse", 0.125],
                    ["reverse", 0.125],
                    ["reverse", 0.125],
                    ["reverse", 0.125],
                    ["reverse", 0.125],
                    [{ scale: 1, rotateZ: 0 }, 0.20]
                ]
            },
            "legacy.rotate": {
                defaultDuration: 1000,
                calls: [
                    [{ rotateZ: 360 }, 1, { easing: "linear" }],
                    [{ rotateZ: 0 }, 0],
                ]
            },
            "transition.fadeIn": {
                defaultDuration: 500,
                calls: [
                    [{ opacity: 0 }, 0],
                    [{ opacity: 1 }, 1]
                ]
            },
            "transition.fadeOut": {
                defaultDuration: 500,
                calls: [
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0 }, 1]
                ]
            },
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.flipXIn": {
                defaultDuration: 700,
                calls: [
                    [{ opacity: 0, transformPerspective: 800, rotateY: -55 }, 0],
                    [{ opacity: 1, rotateY: 0 }, 1],
                    [{ transformPerspective: 0 }]
                ]
            },
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.flipXOut": {
                defaultDuration: 700,
                calls: [
                    [{ opacity: 1, transformPerspective: 800, rotateY: 0 }, 0],
                    [{ opacity: 0, rotateY: 55 }, 1],
                    [{ transformPerspective: 0 }]
                ]
            },
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.flipYIn": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 0, transformPerspective: 800, rotateX: -45 }, 0],
                    [{ opacity: 1, rotateX: 0 }, 1],
                    [{ transformPerspective: 0 }]
                ]
            },
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.flipYOut": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 1, transformPerspective: 800, rotateX: 0 }, 0],
                    [{ opacity: 0, rotateX: 45 }, 1],
                    [{ transformPerspective: 0 }]
                ]
            },
            /* Animate.css */
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.flipBounceXIn": {
                defaultDuration: 900,
                calls: [
                    [{ opacity: 0, transformPerspective: 400, rotateY: 90 }, 0],
                    [{ opacity: 0.725, rotateY: -10 }, 0.50],
                    [{ opacity: 0.80, rotateY: 10 }, 0.25],
                    [{ opacity: 1, rotateY: 0 }, 0.25],
                    [{ transformPerspective: 0 }]
                ]
            },
            /* Animate.css */
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.flipBounceXOut": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 1, transformPerspective: 400, rotateY: 0 }, 0],
                    [{ opacity: 0.9, rotateY: -10 }, 0.5],
                    [{ opacity: 0, rotateY: 90 }, 0.5],
                    [{ transformPerspective: 0 }]
                ]
            },
            /* Animate.css */
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.flipBounceYIn": {
                defaultDuration: 850,
                calls: [
                    [{ opacity: 0, transformPerspective: 400, rotateX: 90 }, 0],
                    [{ opacity: 0.725, rotateX: -10 }, 0.50],
                    [{ opacity: 0.80, rotateX: 10 }, 0.25],
                    [{ opacity: 1, rotateX: 0 }, 0.25],
                    [{ transformPerspective: 0 }]
                ],
            },
            /* Animate.css */
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.flipBounceYOut": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 1, transformPerspective: 400, rotateX: 0 }, 0],
                    [{ opacity: 0.9, rotateX: -15 }, 0.5],
                    [{ opacity: 0, rotateX: 90 }, 0.5],
                    [{ transformPerspective: 0 }]
                ],
            },
            /* Magic.css */
            "transition.swoopIn": {
                defaultDuration: 850,
                calls: [
                    [{ opacity: 0, transformOriginX: "50%", transformOriginY: "100%", scaleX: 0, scaleY: 0, translateX: -700, translateZ: 0 }, 0],
                    [{ opacity: 1, transformOriginX: "100%", scaleX: 1, scaleY: 1, translateX: 0 }, 1],
                    [{ transformOriginX: "50%", transformOriginY: "50%" }, 0]
                ]
            },
            /* Magic.css */
            "transition.swoopOut": {
                defaultDuration: 850,
                calls: [
                    [{ opacity: 1, transformOriginX: "100%", transformOriginY: "100%" }, 0],
                    [{ opacity: 0, transformOriginX: "50%", scaleX: 0, scaleY: 0, translateX: -700, translateZ: 0 }, 1],
                    [{ transformOriginX: "50%", transformOriginY: "50%", scaleX: 1, scaleY: 1, translateX: 0 }, 0]
                ]
            },
            /* Magic.css */
            /* Support: Loses rotation in IE9/Android 2.3. (Fades and scales only.) */
            "transition.whirlIn": {
                defaultDuration: 850,
                calls: [
                    [{ opacity: 0, transformOriginX: "50%", transformOriginY: "50%", scaleX: 0, scaleY: 0, rotateY: 160 }, 0, { easing: "easeInOutSine" }],
                    [{ opacity: 1, scaleX: 1, scaleY: 1, rotateY: 0 }, 1]
                ]
            },
            /* Magic.css */
            /* Support: Loses rotation in IE9/Android 2.3. (Fades and scales only.) */
            "transition.whirlOut": {
                defaultDuration: 750,
                calls: [
                    [{ opacity: 1, transformOriginX: "50%", transformOriginY: "50%" }, 0, { easing: "swing" }],
                    [{ opacity: 0, scaleX: 0, scaleY: 0, rotateY: 160 }, 1, { easing: "easeInOutQuint" }],
                    [{ scale: 1, scaleX: 1, scaleY: 1, rotateY: 0 }, 0]
                ]
            },
            "transition.shrinkIn": {
                defaultDuration: 750,
                calls: [
                    [{ opacity: 0, transformOriginX: "50%", transformOriginY: "50%", scaleX: 1.5, scaleY: 1.5, translateZ: 0 }, 0],
                    [{ opacity: 1, scaleX: 1, scaleY: 1 }, 1]
                ]
            },
            "transition.shrinkOut": {
                defaultDuration: 600,
                calls: [
                    [{ opacity: 1, transformOriginX: "50%", transformOriginY: "50%" }, 0],
                    [{ opacity: 0, scale: 1.3, translateZ: 0 }, 1],
                ]
            },
            "transition.expandIn": {
                defaultDuration: 700,
                calls: [
                    [{ opacity: 0, transformOriginX: "50%", transformOriginY: "50%", scaleX: 0.625, scaleY: 0.625, translateZ: 0 }, 0],
                    [{ opacity: 1, scaleX: 1, scaleY: 1 }, 1]
                ]
            },
            "transition.expandOut": {
                defaultDuration: 700,
                calls: [
                    [{ opacity: 1, scaleX: 1, scaleY: 1, transformOriginX: "50%", transformOriginY: "50%" }, 0],
                    [{ opacity: 0, translateZ: 0, scaleX: 0.5, scaleY: 0.5 }, 1],
                ]
            },
            /* Animate.css */
            "transition.bounceIn": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 0, scale: 0.3 }, 0],
                    [{ opacity: 1, scale: 1.05 }, 0.35],
                    [{ scale: 0.9, translateZ: 0 }, 0.20],
                    [{ scale: 1 }, 0.45]
                ]
            },
            /* Animate.css */
            "transition.bounceOut": {
                defaultDuration: 800,
                calls: [
                    [{ scale: 0.95 }, 0.35],
                    [{ scale: 1.1, translateZ: 0 }, 0.35],
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, scale: 0.3 }, 0.30],
                    [{ scale: 1 }, 0]
                ],
            },
            /* Animate.css */
            "transition.bounceUpIn": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 0, translateY: 1000 }, 0, { easing: "easeOutCirc" }],
                    [{ opacity: 1, translateY: -30 }, 0.60],
                    [{ translateY: 10 }, 0.20],
                    [{ translateY: 0 }, 0.20]
                ]
            },
            /* Animate.css */
            "transition.bounceUpOut": {
                defaultDuration: 1000,
                calls: [
                    [{ translateY: 20 }, 0.20],
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateY: -1000 }, 0.80, { easing: "easeInCirc" }],
                    [{ translateY: 0 }, 0]
                ],
            },
            /* Animate.css */
            "transition.bounceDownIn": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 0, translateY: -1000 }, 0],
                    [{ opacity: 1, translateY: 30 }, 0.60, { easing: "easeOutCirc" }],
                    [{ translateY: -10 }, 0.20],
                    [{ translateY: 0 }, 0.20]
                ]
            },
            /* Animate.css */
            "transition.bounceDownOut": {
                defaultDuration: 1000,
                calls: [
                    [{ translateY: -20 }, 0.20],
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateY: 1000 }, 0.80, { easing: "easeInCirc" }],
                    [{ translateY: 0 }, 0]
                ]
            },
            /* Animate.css */
            "transition.bounceLeftIn": {
                defaultDuration: 750,
                calls: [
                    [{ opacity: 0, translateX: -1250 }, 0, { easing: "easeOutCirc" }],
                    [{ opacity: 1, translateX: 30 }, 0.60],
                    [{ translateX: -10 }, 0.20],
                    [{ translateX: 0 }, 0.20]
                ]
            },
            /* Animate.css */
            "transition.bounceLeftOut": {
                defaultDuration: 750,
                calls: [
                    [{ translateX: 30 }, 0.20],
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateX: -1250 }, 0.8, { easing: "easeInCirc" }],
                    [{ translateX: 0 }, 0]
                ]
            },
            /* Animate.css */
            "transition.bounceRightIn": {
                defaultDuration: 750,
                calls: [
                    [{ opacity: 0, translateX: 1250 }, 0, { easing: "easeOutCirc" }],
                    [{ opacity: 1, translateX: -30 }, 0.60],
                    [{ translateX: 10 }, 0.20],
                    [{ translateX: 0 }, 0.20]
                ]
            },
            /* Animate.css */
            "transition.bounceRightOut": {
                defaultDuration: 750,
                calls: [
                    [{ translateX: -30 }, 0.20],
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateX: 1250 }, 0.80, { easing: "easeInCirc" }],
                    [{ translateX: 0 }, 0]
                ]
            },
            "transition.slideUpIn": {
                defaultDuration: 900,
                calls: [
                    [{ opacity: 0, translateY: 20, translateZ: 0 }, 0],
                    [{ opacity: 1, translateY: 0 }, 1]
                ]
            },
            "transition.slideUpOut": {
                defaultDuration: 900,
                calls: [
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateY: -20, translateZ: 0 }, 1],
                    [{ translateY: 0 }, 0]
                ]
            },
            "transition.slideDownIn": {
                defaultDuration: 900,
                calls: [
                    [{ opacity: 0, translateY: -20, translateZ: 0 }, 0],
                    [{ opacity: 1, translateY: 0 }, 1]
                ]
            },
            "transition.slideDownOut": {
                defaultDuration: 900,
                calls: [
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateY: 20, translateZ: 0 }, 1],
                    [{ translateY: 0 }, 0]
                ]
            },
            "transition.slideLeftIn": {
                defaultDuration: 1000,
                calls: [
                    [{ opacity: 0, translateX: -20, translateZ: 0 }, 0],
                    [{ opacity: 1, translateX: 0 }, 1]
                ]
            },
            "transition.slideLeftOut": {
                defaultDuration: 1050,
                calls: [
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateX: -20, translateZ: 0 }, 1],
                    [{ translateX: 0 }, 0]
                ]
            },
            "transition.slideRightIn": {
                defaultDuration: 1000,
                calls: [
                    [{ opacity: 0, translateX: 20, translateZ: 0 }, 0],
                    [{ opacity: 1, translateX: 0 }, 1]
                ]
            },
            "transition.slideRightOut": {
                defaultDuration: 1050,
                calls: [
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateX: 20, translateZ: 0 }, 1],
                    [{ translateX: 0 }, 0]
                ]
            },
            "transition.slideUpBigIn": {
                defaultDuration: 850,
                calls: [
                    [{ opacity: 0, translateY: 75, translateZ: 0 }, 0],
                    [{ opacity: 1, translateY: 0 }, 1]
                ]
            },
            "transition.slideUpBigOut": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateY: -75, translateZ: 0 }, 1],
                    [{ translateY: 0 }, 0]
                ],
            },
            "transition.slideDownBigIn": {
                defaultDuration: 850,
                calls: [
                    [{ opacity: 0, translateY: -75 }, 0],
                    [{ opacity: 1, translateY: 0 }, 1]
                ]
            },
            "transition.slideDownBigOut": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateY: 75, translateZ: 0 }, 1],
                    [{ translateY: 0 }, 0]
                ],
            },
            "transition.slideLeftBigIn": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 0, translateX: -75, translateZ: 0 }, 0],
                    [{ opacity: 1, translateX: 0 }, 0.8]
                ]
            },
            "transition.slideLeftBigOut": {
                defaultDuration: 750,
                calls: [
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateX: -75, translateZ: 0 }, 1],
                    [{ translateX: 0 }, 0]
                ],
            },
            "transition.slideRightBigIn": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 0, translateX: 75, translateZ: 0 }, 0],
                    [{ opacity: 1, translateX: 0 }, 1]
                ]
            },
            "transition.slideRightBigOut": {
                defaultDuration: 750,
                calls: [
                    [{ opacity: 1 }, 0],
                    [{ opacity: 0, translateX: 75, translateZ: 0 }, 1],
                    [{ translateX: 0 }, 0]
                ],
            },

            /* Magic.css */
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.perspectiveUpIn": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 0, transformPerspective: 800, transformOriginX: 0, transformOriginY: 0, rotateX: 180 }, 0],
                    [{ opacity: 1, rotateX: 0 }, 1],
                    [{ transformPerspective: 0, transformOriginX: "50%", transformOriginY: "50%" }]
                ],
            },
            /* Magic.css */
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.perspectiveUpOut": {
                defaultDuration: 850,
                calls: [
                    [{ opacity: 1, transformPerspective: 800, transformOriginX: 0, transformOriginY: 0, rotateX: 0 }, 0],
                    [{ opacity: 0, rotateX: 180 }, 1],
                    [{ transformPerspective: 0, transformOriginX: "50%", transformOriginY: "50%" }]
                ],
            },

            /* Magic.css */
            "transition.perspectiveDownIn": {
                defaultDuration: 800,
                calls: [
                    [{ opacity: 0, transformPerspective: 800, transformOriginX: 0, transformOriginY: "100%", rotateX: -180 }, 0],
                    [{ opacity: 1, rotateX: 0 }, 1],
                    [{ transformPerspective: 0, transformOriginX: "50%", transformOriginY: "50%" }]
                ]
            },
            /* Magic.css */
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.perspectiveDownOut": {
                defaultDuration: 850,
                calls: [
                    [{ opacity: 1, transformPerspective: 800, transformOriginX: 0, transformOriginY: "100%", rotateX: 0 }, 0],
                    [{ opacity: 0, rotateX: -180 }, 1],
                    [{ transformPerspective: 0, transformOriginX: "50%", transformOriginY: "50%" }]
                ]
            },

            /* Magic.css */
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.perspectiveLeftIn": {
                defaultDuration: 950,
                calls: [
                    [{ opacity: 0, transformPerspective: 2000, transformOriginX: 0, transformOriginY: 0, rotateY: -180 }, 0],
                    [{ opacity: 1, rotateY: 0 }, 1],
                    [{ transformPerspective: 0, transformOriginX: "50%", transformOriginY: "50%" }]
                ]
            },
            /* Magic.css */
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.perspectiveLeftOut": {
                defaultDuration: 950,
                calls: [
                    [{ opacity: 1, transformPerspective: 2000, transformOriginX: 0, transformOriginY: 0, rotateY: 0 }, 0],
                    [{ opacity: 0, rotateY: -180 }, 1],
                    [{ transformPerspective: 0, transformOriginX: "50%", transformOriginY: "50%" }]
                ],
            },
            /* Magic.css */
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.perspectiveRightIn": {
                defaultDuration: 950,
                calls: [
                    [{ opacity: 0, transformPerspective: 2000, transformOriginX: "100%", transformOriginY: 0, rotateY: 180 }, 0],
                    [{ opacity: 1, rotateY: 0 }, 1],
                    [{ transformPerspective: 0, transformOriginX: "50%", transformOriginY: "50%" }]
                ],
            },
            /* Magic.css */
            /* Support: Loses rotation in IE9/Android 2.3 (fades only). */
            "transition.perspectiveRightOut": {
                defaultDuration: 950,
                calls: [
                    [{ opacity: 1, transformPerspective: 2000, transformOriginX: "100%", transformOriginY: 0, rotateY: 0 }, 0],
                    [{ opacity: 0, rotateY: 180 }, 1],
                    [{ transformPerspective: 0, transformOriginX: "50%", transformOriginY: "50%" }]
                ],
            }
        };

        /* Register the packaged effects. */
        for (var effectName in Velocity.RegisterEffect.packagedEffects) {
            if (Velocity.RegisterEffect.packagedEffects.hasOwnProperty(effectName)) {
                Velocity.RegisterEffect(effectName, Velocity.RegisterEffect.packagedEffects[effectName]);
            }
        }

        /*********************
         Sequence Running
         **********************/

        /* Note: Sequence calls must use Velocity's single-object arguments syntax. */
        Velocity.RunSequence = function (originalSequence) {
            var sequence = $.extend(true, [], originalSequence);

            if (sequence.length > 1) {
                $.each(sequence.reverse(), function (i, currentCall) {
                    var nextCall = sequence[i + 1];

                    if (nextCall) {
                        /* Parallel sequence calls (indicated via sequenceQueue:false) are triggered
                         in the previous call's begin callback. Otherwise, chained calls are normally triggered
                         in the previous call's complete callback. */
                        var currentCallOptions = currentCall.o || currentCall.options,
                            nextCallOptions = nextCall.o || nextCall.options;

                        var timing = (currentCallOptions && currentCallOptions.sequenceQueue === false) ? "begin" : "complete",
                            callbackOriginal = nextCallOptions && nextCallOptions[timing],
                            options = {};

                        options[timing] = function () {
                            var nextCallElements = nextCall.e || nextCall.elements;
                            var elements = nextCallElements.nodeType ? [nextCallElements] : nextCallElements;

                            if (callbackOriginal) {
                                callbackOriginal.call(elements, elements);
                            }
                            Velocity(currentCall);
                        };

                        if (nextCall.o) {
                            nextCall.o = $.extend({}, nextCallOptions, options);
                        } else {
                            nextCall.options = $.extend({}, nextCallOptions, options);
                        }
                    }
                });

                sequence.reverse();
            }

            Velocity(sequence[0]);
        };
    }((window.jQuery || window.Zepto || window), window, (window ? window.document : undefined));
}));
