'use strict';

// TODO(mkhatib): Seperate these into config/routes.js and
// config/interceptors/httpInterceptors.js and add tests for them.
// TODO(mkhatib): Move the autogenerated appConfig.js to config/constants.js.

angular.module('webClientApp', [
  'ngAnimate',
  'ngCookies',
  'ngLocale',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'AppConfig',
  'truncate',
  'snap',
  'angulartics',
  'angulartics.google.analytics',
  'angularFileUpload',
  'angular-loading-bar'
])
  /**
   * Routing.
   */
  .config(['$routeProvider',
      function ($routeProvider) {


    $routeProvider

      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        title: 'منصة النشر العربية',
        isPublic: true
      })

      .when('/login', {
        templateUrl: 'views/login.html',
        controller: 'LoginCtrl',
        title: 'تسجيل الدخول',
        isPublic: true
      })

      .when('/signup', {
        templateUrl: 'views/signup.html',
        controller: 'SignupCtrl',
        title: 'مستخدم جديد',
        isPublic: true
      })

      .when('/articles/new', {
        templateUrl: 'views/articles/edit.html',
        controller: 'NewArticleCtrl',
        title: 'مقال جديد',
        isPublic: false
      })

      .when('/articles/:articleId/edit', {
        templateUrl: 'views/articles/edit.html',
        controller: 'EditArticleCtrl',
        isPublic: false
      })

      .when('/articles/:articleId', {
        templateUrl: 'views/articles/show.html',
        controller: 'ArticleCtrl',
        isPublic: true
      })

      .when('/accounts/reset_password/:resetToken?', {
        templateUrl: 'views/accounts/reset_password.html',
        controller: 'PasswordController',
        isPublic: true
      })

      .when('/profiles/:userId', {
        templateUrl: 'views/profiles/show.html',
        controller: 'ProfileCtrl',
        isPublic: true
      })

      .when('/profiles/:userId/edit', {
        templateUrl: 'views/profiles/edit.html',
        controller: 'EditProfileCtrl',
        isPublic: false
      })

      .otherwise({
        redirectTo: '/'
      });
  }])
  .factory('unAuthenticatedInterceptor', ['$location', '$q', '$rootScope',
      function ($location, $q, $rootScope) {
    return {
      'request': function(config) {
        return config;
      },

      'requestError': function(response) {
        console.error(response);
      },

      'response': function(response) {
        return response;
      },

      'responseError': function(response) {
        if (response.status === 401) {
          var previous = $location.path();
          $rootScope.$broadcast('unauthenticated', {'prev': previous});
          return $q.reject(response);
        }
        else {
          return $q.reject(response);
        }
      }
    };
  }])
  /**
   * Intercept every http request and check for 401 Unauthorized
   * error. Clear the current user and redirect to /login page.
   */
  .config(['$httpProvider', '$locationProvider', function ($httpProvider, $locationProvider) {
    $httpProvider.interceptors.push('unAuthenticatedInterceptor');

    $locationProvider.html5Mode(true).hashPrefix('!');
  }])
  /**
   * Allow embedding specific sites.
   */
  .config(['$sceDelegateProvider', function ($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
      // Allow same origin resource loads.
      'self',
      // Allow loading from YouTube domain.
      'http://www.youtube.com/embed/**',
      'https://www.youtube.com/embed/**'
    ]);
  }])
  /**
   * Disable the spinner for angular-loading-bar.
   */
  .config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = false;
  }])
  /**
   * Everytime the route change check if the user need to login.
   */
  .run(['$location', '$rootScope', '$analytics', 'LoginService', 'GA_TRACKING_ID',
      function ($location, $rootScope, $analytics, LoginService, GA_TRACKING_ID) {

    // ga is the Google analytics global variable.
    if (window.ga) {
      ga('create', GA_TRACKING_ID);
    }

    $rootScope.linkPrefix = 'http://' + document.location.host;

    /**
     * Holds data about page-wide attributes. Like pages title.
     */
    $rootScope.page = {
      title: 'منصة النشر العربية',
      description: 'منصة نشر متخصصة باللغة العربية مفتوحة المصدر',
      image: 'http://' + document.location.host + '/images/manshar@200x200.png'
    };

    /**
     * Logs the user out.
     */
    $rootScope.logout = function () {
      $analytics.eventTrack('Logout', {
        category: 'User'
      });
      LoginService.logout();
    };

    /**
     * Shows the login dialog.
     * @param {string} optPrev Optional previous path to go back to after login.
     */
    $rootScope.showLoginDialog = function(optPrev) {
      $rootScope.$broadcast('unauthenticated', {
        'prev': optPrev
      });
    };

    /**
     * Returns true if the passed user is the same user that is referenced
     * in the resource. This assumes that the resource always have a user
     * property, otherwise it'll return false.
     * @param {Object} user The object representing the user data.
     * @param {Object} resource The object representing the resource (e.g. Article).
     * @returns {boolean} true if the user is the owner of the resource.
     */
    $rootScope.isOwner = function (user, resource) {
      return (!!user && !!resource && !!resource.user &&
              user.id === resource.user.id);
    };

    // If the user is already logged in init the auth headers.
    // This also makes isLoggedIn and currentUser available on rootScope.
    LoginService.init();

    /**
     * If the route to be accessed is private make sure the user is authenticated
     * otherwise, broadcast 'unauthenticated' to show login modal.
     */
    $rootScope.$on('$routeChangeStart', function(event, next, current) {
      if (!LoginService.isAuthorized(next.isPublic)) {
        event.preventDefault();
        // Show the dialog instead of redirecting for all navigations.
        // Except first time landing on the site on protected page.
        if (current) {
          $rootScope.$broadcast('unauthenticated', {
            'prev': next.$$route.originalPath
          });
        } else {
          $location.path('/login').search('prev', next.$$route.originalPath);
        }
      }
    });

    $rootScope.$on('$routeChangeSuccess', function (event, current) {
      $rootScope.page.title = current.$$route.title || $rootScope.page.title;
      $rootScope.page.url = document.location.href;
    });

  }]);
