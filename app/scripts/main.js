/**
 * app main module
 */
var app = angular.module("ABApp", []);

(function(app){
  /**
   * run once on page loaded.
   */
  app.run(function(){
    // init Kii.
    Kii.initializeWithSite("81a08656", "56ddb143a3f3be8365369d630ce650ea", KiiSite.JP);
  });

  /**
   * page controller
   *
   * switch login form and main table.
   */
  app.controller("pageController", ["$scope", function($scope){
    // on boot, show login form and hide main table.
    var PAGE_STATE_LOGINFORM = "loginForm";
    var PAGE_STATE_MAINTABLE = "mainTable";
    $scope.pageState = PAGE_STATE_LOGINFORM;

    //methods.
    /**
     * change page to main table.
     */
    $scope.showMainTable = function(){
      $scope.pageState = PAGE_STATE_MAINTABLE;
    };

    /**
     * change page to login form.
     */
    $scope.showLoginForm = function(){
      $scope.pageState = PAGE_STATE_LOGINFORM;
    };

  }]);

  /**
   * login form controller
   */
  app.controller("loginFormController", [ "$scope", "User", function($scope, User){
    $scope.User = User;

    // methods.
    /**
     * initialize
     * auto login.
     */
    $scope.init = function(){
      $scope.loginAuto();
    };

    /**
     * login
     * if login success, change page to main table.
     */
    $scope.login = function(){
      var onSuccess = function(){
        // TODO: this is correct...?
        $scope.$parent.showMainTable();
        // apply scope data.
        $scope.$parent.$apply();
      };
      var onFailure = function(){
        // TODO: show login failed.
        alert("failure");
      };
      User.login(onSuccess, onFailure);
    };

    /**
     * auto login by access token.
     */
    $scope.loginAuto = function(){
      var onSuccess = function(){
        $scope.$parent.showMainTable();
        $scope.$parent.$apply();
      };
      var onFailure = function(){
        // do nothing.
      };
      User.loginAccessToken(onSuccess, onFailure);
    };
  }]);

  /**
   * user model
   */
  app.factory("User", function(){
    // private.
    // consts.
    var LOCALSTORAGE_KEY_ACCESS_TOKEN = "token";

    return {
      // properties.
      username: "",
      password: "",
      isLoggedIn: false,

      // methods.
      /**
       * login using username and password.
       */
      login: function(onSuccess, onFailure){
        var me = this;
        var callbacks = {
          success: function(){
            // save access token to localStorage.
            localStorage.setItem(LOCALSTORAGE_KEY_ACCESS_TOKEN, KiiUser.getCurrentUser().getAccessToken());
            me.isLoggedIn = true;
            onSuccess();
          },
          failure: function(){
            onFailure();
          }
        };
        KiiUser.authenticate(me.username, me.password, callbacks);
      },

      /**
       * login using access token.
       * access token is in local storage.
       */
      loginAccessToken: function(onSuccess, onFailure){
        var me = this;
        // get access token from localStorage.
        var token = localStorage.getItem(LOCALSTORAGE_KEY_ACCESS_TOKEN);
        if (!token) {
          onFailure();
          return;
        }
        var callbacks = {
          success: function(){
            me.isLoggedIn = true;
            onSuccess();
          },
          failure: onFailure
        };
        KiiUser.authenticateWithToken(token, callbacks);
      },

      /**
       * logout.
       * remove access token from local storage.
       */
      logout: function(){
        var me = this;
        localStorage.removeItem(LOCALSTORAGE_KEY_ACCESS_TOKEN);
        me.isLoggedIn = false;
      }
    };
  });

  /**
   * main table controller.
   */
  app.controller("mainTableController", [ "$scope", "accountData", "tagData", function($scope, accountData, tagData){
    // properties.
    $scope.accountData = accountData;
    $scope.tags = tagData.tags;

    // methods.
    /**
     * load account data.
     */
    $scope.load = function(){
      var onSuccess = function(){
        $scope.$apply();
      }
      accountData.load({}, onSuccess);
    };

    /**
     * load tag data.
     */
    $scope.loadTag = function(){
      var onSuccess = function(){
        $scope.$apply();
      }
      tagData.load(onSuccess);
    };

    /**
     * remove account data.
     */
    $scope.remove = function($event){
      // get data id from tr element.
      // event target (button)'s parent's parent's is tr.
      var tr = $event.target.parentNode.parentNode;
      var accountId = tr.getAttribute("data-id");
      var onSuccess = function(){
        $scope.$apply();
      };
      accountData.remove(accountId, onSuccess);
    };

    // watch
    // load data when main table appears.
    $scope.$watch($scope.$parent.pageState, function(){
      if ($scope.$parent.pageState == "mainTable"){
        $scope.loadTag();
        $scope.load();
      }
    });

    // events.
    $scope.$on("load", function(){
      alert("load event");
    });
  }]);

  /**
   * account data model.
   */
  app.factory("accountData", function(){
    // private.
    // consts
    var BUCKET_NAME_ACCOUNT = "account";

    // methods.
    /**
     * calc total price.
     */
    function calcTotalPrice(accounts){
      var totalPrice = _.reduce(accounts, function(memo, account){
        return memo + account.price;
      }, 0);
      return totalPrice;
    }

    return {
      // properties.
      // account array.
      accounts: [],
      // total price.
      totalPrice: {
        all: 0,
        perTag: {}
      },

      // methods.
      /**
       * load account data.
       * from KiiCloud.
       */
      load: function(cond, onSuccess, onFailure){
        var me = this;
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(BUCKET_NAME_ACCOUNT);

        // reset
        me.accounts = [];
        me.totalPrice.all = 0;
        me.totalPrice.perTag = {};

        // TODO: condition
        var query = KiiQuery.queryWithClause();
        var callbacks = {
          success: function(queryPerformed, resultSet, nextQuery){
            var accounts = [];
            _.each(resultSet, function(result){
              accounts.push({
                id: result.objectURI(),
                date: moment(new Date(result.get("date"))).format("YYYY-MM-DD"),
                name: result.get("name"),
                tags: result.get("tags"),
                price: result.get("price")
              });
            });
            me.accounts = me.accounts.concat(accounts);
            if (nextQuery) {
              bk.executeQuery(nextQuery, callbacks);
            } else {
              me.totalPrice.all = calcTotalPrice(me.accounts);
              //me.calcTotalPricePerTag();
              if (onSuccess) onSuccess();
            }
          },
          failure: function(queryPerformed, errorString){
            if (onFailure) onFailure();
          }
        };

        bk.executeQuery(query, callbacks);
      },

      /**
       * save 1 data to KiiCloud.
       */
      save: function(account){
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(BUCKET_NAME_ACCOUNT);

        var obj = bk.createObject();
        obj.set("date", account.date);
        obj.set("name", account.name);
        obj.set("tags", account.tags);
        obj.set("price", account.price);

        obj.save({
          success: function(theObject){
          },
          failure: function(theObject, errorString){
            console.log(errorString);
          }
        });
      },

      /**
       * remove 1 data from KiiCloud.
       */
      remove: function(id, onSuccess, onFailure){
        // id is uri of KiiCloud.
        var obj = KiiObject.objectWithURI(id);
        var me = this;
        // if success, remove from me.accounts also.
        var _onSuccess = function(){
          // TODO: need to fast access by id. such as hash...
          var removedAccount = (function(accounts){
            for (var i = 0, n = accounts.length; i < n; i++){
              if (me.accounts[i].id === id) {
                return {
                  index: i,
                  data: accounts[i]
                };
              }
            }
            return null;
          })(me.accounts);
          if (removedAccount !== null) {
            // calc total.
            me.totalPrice.all -= removedAccount.data.price;
            // TODO: total per tag.
            me.accounts.splice(removedAccount.index, 1);
          }

          onSuccess();
        }

        if (obj) {
          obj.delete({
            success: _onSuccess,
            failure: onFailure
          });
        }
      }
    };
  });

  /**
   * tag data model.
   */
  app.factory("tagData", function(){
    // privates.
    // consts.
    var BUCKET_NAME_TAG = "tag";

    return {
      // properties.
      tags: {},
      tags_reverse: {},

      // methods.
      /**
       * load tag data from KiiCloud.
       * after loading, call callback function to notify tag data.
       */
      load: function(onSuccess, onFailure){
        var me = this;
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(BUCKET_NAME_TAG);

        var query = KiiQuery.queryWithClause();
        var callbacks_kiiCloud = {
          success: function(queryPerformed, resultSet, nextQuery){
            _.each(resultSet, function(result){
              var name = result.get("name");
              var id = result.get("id");
              me.tags[id] = name;
              me.tags_reverse[name] = id;
            });
            if (nextQuery) {
              bk.executeQuery(nextQuery, callbacks);
            } else {
              // all tag data is loaded.
              // call callback function.
              // TODO: copy hash(tags).
              if (onSuccess) onSuccess();
            }
          },
          failure: function(queryPerformed, errorString){
            if (onFailure) onFailure();
          }
        };

        bk.executeQuery(query, callbacks_kiiCloud);
      },

      /**
       * save tag to KiiCloud.
       * tag id is epoch msec.
       * if success, store new tag data in tags property.
       * after save, call callback.
       */
      save: function(tag, onSuccess, onFailure){
        var me = this;
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(BUCKET_NAME_TAG);
        var tagId = "" + (new Date()).getTime();

        var obj = bk.createObject();
        obj.set("id", tagId);
        obj.set("name", tag.name);

        obj.save({
          success: function(theObject){
            me.tags[tagId] = tag.name;
            if (onSuccess) onSuccess();
          },
          failure: function(theObject, errorString){
            if (onFailure) onFailure();
          }
        });
      },
    };
  });

  /**
   * sum total controller.
   */
  app.controller("sumTotalController", [ "$scope", "accountData", "tagData", function($scope, accountData, tagData){
    $scope.total = accountData.totalPrice;
  }]);

  /**
   * create account data controller.
   */
  app.controller("createDataController", [ "$scope", "accountData", "accountSave", "tagData", function($scope, accountData, accountSave, tagData){
    $scope.account = accountSave;
    $scope.tags = tagData.tags;

    // methods.
    /**
     * create account data.
     */
    $scope.create = function(){
      accountData.save(accountSave.getValidData());
    };
  }]);

  /**
   * create account data model.
   */
  app.value("accountSave", {
    date: null,
    name: "",
    tags: {},
    price: 0,

    // methods.
    /**
     * return valid account save data.
     * convert tags property.
     */
    getValidData: function(){
      var me = this;
      var tags = [];
      _.each(me.tags, function(tag, key){
        tags.push(key);
      });
      return {
        date: new Date(me.date),
        name: me.name,
        tags: tags,
        price: parseInt(me.price, 10)
      };
    }
  });

  /**
   * edit tag controller
   */
  app.controller("editTagController", [ "$scope", "tagData", "tagSave", function($scope, tagData, tagSave){
    $scope.tags = tagData.tags;
    $scope.newTag = tagSave;

    // methods.
    /**
     * create new tag.
     */
    $scope.create = function(){
      var onSuccess = function(){
        $scope.$apply();
      };
      tagData.save(tagSave.getValidData(), onSuccess);
    };
  }]);

  /**
   * create tag model.
   */
  app.value("tagSave", {
    name: "",

    /**
     * return valid tag name data.
     */
    getValidData: function(){
      var me = this;
      return {
        name: me.name
      };
    }
  });

  /**
   * header area controller.
   */
  app.controller("headerAreaController", [ "$scope", "User", function($scope, User){
    $scope.user = User;

    // methods.
    /**
     * logout.
     * logout and move to login form page.
     */
    $scope.logout = function(){
      User.logout();
      $scope.$parent.showLoginForm();
    };
  }]);

})(app);
