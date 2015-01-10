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
  app.controller("pageController", function($scope){
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

  });

  /**
   * login form controller
   */
  app.controller("loginFormController", function($scope, User){
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
  });

  /**
   * user model
   */
  app.factory("User", function(){
    return {
      // properties.
      username: "",
      password: "",

      // consts
      LOCALSTORAGE_KEY_ACCESS_TOKEN: "token",

      // methods.
      /**
       * login using username and password.
       */
      login: function(onSuccess, onFailure){
        var me = this;
        var callbacks = {
          success: function(){
            // save access token to localStorage.
            localStorage.setItem(me.LOCALSTORAGE_KEY_ACCESS_TOKEN, KiiUser.getCurrentUser().getAccessToken());
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
        var token = localStorage.getItem(me.LOCALSTORAGE_KEY_ACCESS_TOKEN);
        if (!token) {
          onFailure();
        }
        var callbacks = {
          success: onSuccess,
          failure: onFailure
        };
        KiiUser.authenticateWithToken(token, callbacks);
      },
    };
  });

  /**
   * main table controller.
   */
  app.controller("mainTableController", function($scope, accountData, tagData){
    // properties.
    $scope.accountData = accountData;
    $scope.tagData = tagData;

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
  });

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
    };
  });

  /**
   * sum total controller.
   */
  app.controller("sumTotalController", function($scope, accountData, tagData){
    $scope.total = accountData.totalPrice;
  });

  /**
   * create account data controller.
   */
  app.controller("createDataController", function($scope, accountData, accountSave){
    $scope.account = accountSave;

    // methods.
    /**
     * create account data.
     */
    $scope.create = function(){
      accountData.save(accountSave.getValidData());
    };
  });

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
     */
    getValidData: function(){
      var me = this;
      return {
        date: new Date(me.date),
        name: me.name,
        tags: me.tags,
        price: parseInt(me.price, 10)
      };
    }
  });

  /**
   * edit tag controller
   */
  app.controller("editTagController", function($scope, tagData){
    $scope.tags = tagData.tags;

  });

})(app);

// namespace AB
var AB = {
  // about authentication.
  auth: {
    // consts.
    LOCALSTORAGE_KEY_ACCESS_TOKEN: "token",

    // methods.
    /**
     * authenticate user.
     */
    authenticateUser: function(username, password, onSuccess, onFailure){
      var me = this;
      KiiUser.authenticate(username, password, {
        success: function(){
          // save access token to localStorage.
          localStorage.setItem(me.LOCALSTORAGE_KEY_ACCESS_TOKEN, KiiUser.getCurrentUser().getAccessToken());
          onSuccess();
        },
        failure: onFailure
      });
    },

    /**
     * authenticate user using access token.
     */
    authenticateByToken: function(token, onSuccess, onFailure){
      KiiUser.authenticateWithToken(token, {
        success: onSuccess,
        failure: onFailure
      })
        // TODO:
    },

    /**
     * initialize login page.
     * first, try to login using access token.
     * if login is failed(such as no token...), show login form.
     */
    initLoginPage: function(){
      if (!this.loginByToken()){
        $("#login-button").on("click", function(){
          AB.auth.login();
        });

        $("#login-form").css("display", "");
      }
    },

    /**
     * login and move account book page.
     * fire when login button clicked.
     */
    login: function(){
      var username = $("#username").val();
      var password = $("#password").val();
      var onSuccess = function(user){
        // move to main page.
        AB.main.Controller.init();
        // hide login page.
        $("#login-form").css("display", "none");
      };
      var onFailure = function(user, errorString){
        // TODO: show error message
        console.log(errorString);
      };

      this.authenticateUser(username, password, onSuccess, onFailure);
    },

    /**
     * auto login using access token.
     * access token is stored in localStorage.
     */
    loginByToken: function(){
      var storage = localStorage;
      var token = storage.getItem(this.LOCALSTORAGE_KEY_ACCESS_TOKEN);
      var onSuccess = function(user){
        // move to main page.
        AB.main.Controller.init();
        // hide login page.
        $("#login-form").css("display", "none");
      };
      var onFailure = function(user, errorString){
        // TODO: show error message
        console.log(errorString);
      };

      if (token) {
        this.authenticateByToken(token, onSuccess, onFailure);
      } else {
        return false;
      }
    }
  },

  // about main table.
  main: {
    // Models.

    /**
     * account data
     */
    AccountData: {
      // vars.
      accounts: [],
      totalPrice: 0,
      pricePerTag: {},

      // consts.
      BUCKET_NAME_ACCOUNT: "account",

      // methods
      /**
       * load from KiiCloud.
       */
      load: function(cond){
        var me = this;
        var View = AB.main.View;
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(this.BUCKET_NAME_ACCOUNT);

        // reset
        me.accounts = [];
        me.totalPrice = 0;
        me.pricePerTag = {};

        // TODO: condition
        var query = KiiQuery.queryWithClause();
        var callbacks = {
          success: function(queryPerformed, resultSet, nextQuery){
            var accounts = [];
            _.each(resultSet, function(result){
              accounts.push({
                id: result.objectURI(),
                date: new Date(result.get("date")),
                name: result.get("name"),
                tags: result.get("tags"),
                price: result.get("price")
              });
            });
            // trigger "add" event.
            View.emit("add", accounts);
            me.accounts = me.accounts.concat(accounts);
            if (nextQuery) {
              bk.executeQuery(nextQuery, callbacks);
            } else {
              me.calcTotalPrice();
              me.calcTotalPricePerTag();
            }
          },
          failure: function(queryPerformed, errorString){
            // TODO:
          }
        };

        bk.executeQuery(query, callbacks);
      },

      /**
       * calc total price.
       */
      calcTotalPrice: function(){
        this.totalPrice = _.reduce(this.accounts, function(memo, account){
          return memo + account.price;
        }, 0);
        AB.main.View.emit("total", this.totalPrice);
      },

      /**
       * calc total price per tag.
       */
      calcTotalPricePerTag: function(){
        var pricePerTag = {};
        _.each(this.accounts, function(account){
          _.each(account.tags, function(tag){
            pricePerTag[tag] = (pricePerTag[tag] || 0) + account.price;
          });
        });
        this.pricePerTag = pricePerTag;
        // TODO: change firing View event to firing Controler event.
        // TODO: don't trigger View event directly.
        AB.main.View.emit("totalPerTag", this.pricePerTag);
      },

      /**
       * save 1 data to KiiCloud.
       */
      save: function(account){
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(this.BUCKET_NAME_ACCOUNT);

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
      remove: function(id){
        // id is uri of KiiCloud.
        var obj = KiiObject.objectWithURI(id);
        var View = AB.main.View;

        if (obj) {
          obj.delete({
            success: function(theDeletedObject){
              View.emit("remove", id);
            },
            failure: function(theObject, errorString){
              //
            }
          });
        }
      }
    },

    /**
     * tag data
     */
    TagData: {
      // vars.
      // hash of id -> tagname
      tags: {},
      // hash of tagname -> id
      tags_reverse: {},

      // consts.
      BUCKET_NAME_TAG: "tag",

      // methods.
      /**
       * load tag data from KiiCloud.
       * after loading, call callback function to notify tag data.
       */
      load: function(callback){
        var me = this;
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(this.BUCKET_NAME_TAG);

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
              if (callback) callback(me.tags);
            }
          },
          failure: function(queryPerformed, errorString){
            // TODO:
          }
        };

        bk.executeQuery(query, callbacks_kiiCloud);
      },

      /**
       * get tag name from id.
       */
      getName: function(id){
        return this.tags[id];
      },

      /**
       * save tag to KiiCloud.
       * tag id is epoch msec.
       * if save is success, call callback function.
       */
      save: function(tag, callback){
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(this.BUCKET_NAME_TAG);
        var tagId = "" + (new Date()).getTime();

        var obj = bk.createObject();
        obj.set("id", tagId);
        obj.set("name", tag.name);

        obj.save({
          success: function(theObject){
            callback({
              id: tagId,
              name: tag.name
            });
          },
          failure: function(theObject, errorString){
            console.log(errorString);
          }
        });
      },
    },

    /**
     * Session
     * login, logout
     */
    Session: {
      /**
       * login
       * TODO: move from AB.auth object.
       */

      /**
       * logout
       * disable access token, remove access token from localstorage,
       * and reload page.
       */
      logout: function(){
        // access token is expired in 1 sec.
        Kii.setAccessTokenExpiration(1);
        // TODO: LOCALSTORAGE_KEY_ACCESS_TOKEN have to be moved to Session class.
        var storage = localStorage;
        storage.removeItem(AB.auth.LOCALSTORAGE_KEY_ACCESS_TOKEN);

        location.reload();
      }
    },

    // view.
    View: {
      // vars.
      eventHandlers: null,

      /**
       * initialize
       */
      init: function(){
        $("#main-table").css("display", "");

        // create menu in top navigation.
        var fragment = "<li><a href='#' id='logout'>Logout</a></li>";
        $("#topnavi-menu").append(fragment);

        // event handler
        var me = this;
        me.eventHandlers = {
          "add": function(){ me.addAccount.apply(me, arguments); },
          "total": function(){ me.showTotalPrice.apply(me, arguments); },
          "totalPerTag": function(){ me.showTotalPricePerTag.apply(me, arguments); },
          "remove": function(){ me.removeAccount.apply(me, arguments); },
          "changeTag": function() { me.changeTag.apply(me, arguments); }
        };

        // button actions.
        $("#add-data-add").on("click", function(){
        });
        $("#add-data-add-inarow").on("click", function(){
            me.onClick_AddInARow();
        });
        $("#reload-main-table").on("click", function(){
            me.onClick_Reload();
        });
        $("#create-new-tag").on("click", function(){
            me.onClick_CreateTag();
        });
        $("#logout").on("click", function(){
            me.onClick_Logout();
        });
      },

      /**
       * add account data to bottom of table.
       */
      addAccount: function(accounts){
        var table = $("#account-data-table");
        var TagData = AB.main.TagData;

        var fragment = "";
        _.each(accounts, function(account){
          fragment += "<tr data-id='" + account.id + "'>";
          fragment += "<td>" + moment(account.date).format("YYYY-MM-DD") + "</td>";
          fragment += "<td>" + account.name + "</td>";
          fragment += "<td>"; 
          _.each(account.tags, function(tag){
            fragment += "<span class='tag'>" + TagData.getName(tag) + "</span>";
          });
          fragment += "</td>";
          fragment += "<td>" + account.price + "</td>";
          fragment += "<td><button class='btn btn-default btn-xs remove-data-button'><span class='glyphicon glyphicon-remove'></span></button></td>";
          fragment += "</tr>";
        });

        table.append(fragment);

        // add click event handler to all "remove button".
        // TODO: only buttons that are created in above append.
        var buttons = $("button.remove-data-button", table);
        buttons.on("click", this.onClick_Remove);
      },

      /**
       * show total price.
       */
      showTotalPrice: function(price){
        $("#total-price").html(price.toLocaleString());
      },

      /**
       * show total price per tag.
       */
      showTotalPricePerTag: function(pricesPerTag){
        var fragment = "<table>";
        _.each(pricesPerTag, function(price, tagName){
          fragment += "<tr>";
          fragment += "<td><span class='tag'>" + tagName + "</span></td>";
          fragment += "<td class='price'>" + price + "</td>";
          fragment += "</tr>";
        });
        $("#total-per-tag").html(fragment);
      },

      /**
       * remove account data row.
       */
      removeAccount: function(id){
        var tr = $("tr[data-id=\"" + id + "\"]");
        tr.remove();
      },

      /**
       * remove all data in main table.
       */
      clearTable: function(){
        $("#account-data-table tbody tr").remove();
      },

      /**
       * change shown tag info when tag is changed.
       */
      changeTag: function(){
        var tags = AB.main.Controller.tags;
        // add data dialog.
        (function(){
          var fragment = "";
          _.each(tags, function(tagName, index){
            fragment += "<input type='checkbox' data-tag-id='" + index + "''>";
            fragment += "<span class='tag'>" + tagName + "</span>";
          });
          $("#add-data-tag-area").html(fragment);
        })();
        // edit tag dialog.
        (function(){
          var fragment = "";
          _.each(tags, function(tagName, index){
            fragment += "<span class='tag' data-tag-id='" + index + "'>" + tagName + "</span>";
          });
          $("#edit-tag-area").html(fragment);
        })();
      },

      /**
       * fired when clicked "logout" link.
       */
      onClick_Logout: function(){
        var Controller = AB.main.Controller;
        Controller.emit("logout");
      },

      /**
       * fired when clicked "remove" button.
       */
      onClick_Remove: function(){
        // "this" is button element.
        var dataId = this.parentNode.parentNode.getAttribute("data-id");
        var AccountData = AB.main.AccountData;

        AccountData.remove(dataId);
      },

      /**
       * fired when clicked "reload" button.
       */
      onClick_Reload: function(){
        var Controller = AB.main.Controller;
        Controller.emit("reload-data");
      },

      /**
       * fired when clicked "add" in add-data form.
       */
      onClick_Add: function(){
        // TODO:
      },

      /**
       * fired when clicked "add in a row" in add-data form.
       */
      onClick_AddInARow: function(){
        var Controller = AB.main.Controller;
        var date = new Date($("#add-data-date").val());
        var name = $("#add-data-name").val();
        var tags = [];
        var checkedTags = $("#add-data-tag-area input[type=checkbox]:checked");
        for (var i = 0, n = checkedTags.length; i < n; i++) {
          var tagId = checkedTags[i].getAttribute('data-tag-id');
          tags.push(tagId);
        }
        var price = parseInt($("#add-data-price").val(), 10);
        Controller.emit("add-data", {
            date: date,
            name: name,
            tags: tags,
            price: price
        });
      },

      /**
       * fired when clicked "create" in edit tag form.
       */
      onClick_CreateTag: function(){
        var Controller = AB.main.Controller;
        var tagName = $("#create-tag-name").val();
        Controller.emit("create-tag", {
          name: tagName
        });
      },

      /**
       * trigger event by out of View object.
       */
      emit: function(eventName, data){
        var me = this;
        var eventHandler = me.eventHandlers[eventName];
        setTimeout(function(){ eventHandler(data); }, 0);
      }
    },

    // controller.
    Controller: {
      // data for view.
      // account data
      accounts: [],
      // tags
      tags: {},

      /**
       * initialize
       */
      init: function(){
        AB.main.View.init();

        // event handler
        var me = this;
        me.eventHandlers = {
          "add-data": function(){ me.createAccountData.apply(me, arguments); },
          "reload-data": function(){ me.load.apply(me, arguments); },
          "create-tag": function(){ me.createTag.apply(me, arguments); },
          "logout": function(){ me.logout.apply(me, arguments); }
        };

        // load tag data.
        this.loadTag();
        // load this month data.
        this.load();
      },

      /**
       * load tag data, store to "tags" property, and notify to View.
       */
      loadTag: function(){
        var me = this;
        var View = AB.main.View;
        // if load is success, store tag data and notify to View.
        var callback = function(tags){
          me.tags = tags;
          View.emit("changeTag");
        }
        AB.main.TagData.load(callback);
      },

      /**
       * load account data.
       */
      load: function(cond){
        var View = AB.main.View;
        var AccountData = AB.main.AccountData;
        View.clearTable();
        AccountData.load(cond);
      },

      /**
       * create account data.
       */
      createAccountData: function(data){
        var AccountData = AB.main.AccountData;
        AccountData.save(data);
      },

      /**
       * create new tag.
       */
      createTag: function(data){
        var me = this;
        var TagData = AB.main.TagData;
        var View = AB.main.View;
        // if create is success, change tag data and notify to View.
        var callback = function(createdTag){
          me.tags[createdTag.id] = createdTag.name;
          View.emit("changeTag");
        };
        TagData.save(data, callback);
      },

      /**
       * logout
       */
      logout: function(){
        var Session = AB.main.Session;
        Session.logout();
      },

      /**
       * trigger event by out of Controller object.
       */
      emit: function(eventName, data){
        var me = this;
        var eventHandler = me.eventHandlers[eventName];
        setTimeout(function(){ eventHandler(data); }, 0);
      }
    },
  },

  // about utilities.
  util: {
    createClass: function(constructor, proto, staticMethod){
      var tmp_class = function(){
        constructor.apply(this, arguments);
        return this;
      };
      if (proto) tmp_class.prototype = proto;
      if (staticMethod) _.extend(tmp_class, staticMethod);
      return tmp_class;
    }
  }
};


