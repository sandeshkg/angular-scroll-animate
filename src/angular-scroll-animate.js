'use strict';

/**
 * @ngdoc directive
 * @name angular-scroll-animate.directive:when-visible
 * @restrict A
 * @param {string} when-not-visible function to execute when element is scrolled into viewport
 * @param {string=} when-not-visible function to execute when element is scrolled out of viewport
 * @param {number=} delayPercent percentage (of px) to delay animate when visible transition.
 * @param {number=} delayPercentViewport percentage (of viewport height) to delay animate when visible transition.
 * @param {number=} delayPixels to delay animate when visible transition.
 * @param {string=} bindScrollTo override default scroll event binding to another parent container.
 *
 * @description
 * Allows method hooks into the detection of when an element is scrolled into or out of view.
 *
 * @example
 * <example module="angular-scroll-animate">
 *   <file name="index.html">
 *     <div ng-controller="ExampleCtrl">
 *       <div class="car" when-visible="animateIn">Broom with simplest config</div>
 *       <div class="car" when-visible="animateIn" when-not-visible="animateOut" delay-pixels="50" delay-percent="0.25" delay-percent-viewport="0.1">Broom with all options</div>
 *     </div>
 *   </file>
 *   <file name="controller.js">
 *   angular.module('example', []).controller('ExampleCtrl', function($scope) {
 *
 *     $scope.animateIn = function($el) {
 *       $el.removeClass('hidden');
 *       $el.addClass('fadeIn');
 *     };
 *
 *     $scope.animateOut = function($el) {
 *      $el.addClass('hidden');
 *       $el.removeClassClass('fadeIn');
 *     };
 *   });
 *
 *   </file>
 *   <file name="animations.css">
 *     .hidden { visibility: hidden; }
 *     .fadeIn { transition: all 300ms ease-in 2s; }
 *   </file>
 * </example>
 */
angular.module('angular-scroll-animate', []).directive('whenVisible', ['$document', '$window',
 function($document, $window) {

    var determineWhereElementIsInViewport =
      function($el, document, whenVisibleFn, whenNotVisibleFn, delayPercent, delayPercentViewport, delayPixels, scope) {

        var elementBounds = $el[0].getBoundingClientRect();
        var viewportHeight = document.clientHeight;

        var panelTop = elementBounds.top;
        var panelBottom = elementBounds.bottom;

        var delayPx; // pixel buffer until deciding to show the element
        var delayPxValues = [];
        if (delayPixels) {
          delayPxValues.push(delayPixels);
        }
        if (delayPercentViewport) {
          delayPxValues.push(delayPercentViewport * $window.innerHeight);
        }
        if (delayPercent) {
          delayPxValues.push(delayPercent * elementBounds.height);
        }

        if (delayPxValues.length === 0) {
          delayPx = 0.25 * elementBounds.height;
        }
        else {
          delayPx = Math.min.apply(Math, delayPxValues); //Show element as soon as any delay has been fulfilled
        }

        var bottomVisible = (panelBottom - delayPx > 0) && (panelBottom < viewportHeight);
        var topVisible = (panelTop + delayPx <= viewportHeight) && (panelTop > 0);

        if ($el.data('hidden') && (bottomVisible || topVisible)) {
          whenVisibleFn($el, scope);
          $el.data('hidden', false);
        }

        // scrolled out from scrolling down or up
        else if (!($el.data('hidden')) && (panelBottom < 0 || panelTop > viewportHeight)) {
          whenNotVisibleFn($el, scope);
          $el.data('hidden', true);
        }
      };

    return {
      restrict: 'A',
      scope: {
        whenVisible: '&',
        whenNotVisible: '&?',
        delayPercent: '=?',
        delayPercentViewport: '=?',
        delayPixels: '=?',
        bindScrollTo: '@?'
      },

      controller: ['$scope', function(scope) {
        if (!scope.whenVisible || !angular.isFunction(scope.whenVisible())) {
          throw new Error('Directive: angular-scroll-animate \'when-visible\' attribute must specify a function.');
        }

        if (scope.whenNotVisible && !angular.isFunction(scope.whenNotVisible())) {
          throw new Error('Directive: angular-scroll-animate \'when-not-visible\' attribute must specify a function.');
        }
        else if (!scope.whenNotVisible) {
          scope.whenNotVisible = function() {
            return angular.noop;
          };
        }

        if (scope.delayPercent) {

          var delayPercent = parseFloat(scope.delayPercent);

          if (!angular.isNumber(delayPercent) || (delayPercent < 0 || delayPercent > 1)) {
            throw new Error('Directive: angular-scroll-animate \'delay-percent\' attribute must be a decimal fraction between 0 and 1.');
          }
        }
    }],

      link: function(scope, el, attributes) {

        var delayPercent = attributes.delayPercent; //Fallback is be 0.25% delayPercent if no delay is specified, set in determineWhereElementIsInViewport function
        var delayPercentViewport = attributes.delayPercentViewport;
        var delayPixels = attributes.delayPixels;
        var document = $document[0].documentElement;
        var checkPending = false;

        var updateVisibility = function() {
          determineWhereElementIsInViewport(el, document, scope.whenVisible(), scope.whenNotVisible(), delayPercent, delayPercentViewport, delayPixels, scope);

          checkPending = false;
        };

        var onScroll = function() {

          if (!checkPending) {
            checkPending = true;

            /* globals requestAnimationFrame */
            requestAnimationFrame(updateVisibility);
          }
        };

        var documentListenerEvents = 'scroll';

        /* allows overflow:auto on container element to animate for Safari browsers */
        if (attributes.bindScrollTo) {
          angular.element($document[0].querySelector(attributes.bindScrollTo)).on(documentListenerEvents, onScroll);
        }

        /* always bind to document scroll as well - works for overflow: auto on Chrome, Firefox browsers */
        $document.on(documentListenerEvents, onScroll);

        scope.$on('$destroy', function() {
          $document.off(documentListenerEvents, onScroll);
        });

        var $elWindow = angular.element($window);
        var windowListenerEvents = 'resize orientationchange';
        $elWindow.on(windowListenerEvents, onScroll);

        scope.$on('$destroy', function() {
          $elWindow.off(windowListenerEvents, onScroll);
        });

        // initialise
        el.data('hidden', true);
        scope.$evalAsync(onScroll);
      }
    };
 }]);
