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
  app.controller("mainTableController", [ "$scope", "accountData", "tagData", "dateRange", function($scope, accountData, tagData, dateRange){
    // properties.
    $scope.accountData = accountData;
    $scope.tags = tagData.tags;

    // methods.
    /**
     * load account data.
     */
    $scope.load = function(){
      // generate condition.
      var cond = dateRange.generateCondition();
      // callback.
      var onSuccess = function(){
        $scope.$apply();
      }
      accountData.load(cond, onSuccess);
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

    /**
     * change sort column and direction.
     */
    $scope.sort = function(column){
      accountData.sort(column);
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

    /**
     * calc total per tag.
     */
    function calcTotalPerTag(accounts){
      var totalPerTag = {};
      _.each(accounts, function(account){
        _.each(account.tags, function(tag){
          totalPerTag[tag] = (totalPerTag[tag] || 0) + account.price;
        });
      });
      return totalPerTag;
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
      // sort column.
      sorted: {
        "date": true,
        "name": false,
        "tags": false,
        "price": false
      },
      // sort direction. true is ascend, false is descend.
      sortDirection: true,

      // methods.
      /**
       * load account data.
       * from KiiCloud.
       */
      load: function(cond, onSuccess, onFailure){
        var me = this;
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(BUCKET_NAME_ACCOUNT);
        cond = cond || {};

        // reset
        me.accounts = [];
        me.totalPrice.all = 0;
        me.totalPrice.perTag = {};

        // condition
        var clauses = [];
        // date range
        if (cond.startDate) {
          clauses.push(KiiClause.greaterThanOrEqual("date", cond.startDate));
        }
        if (cond.endDate) {
          clauses.push(KiiClause.lessThanOrEqual("date", cond.endDate));
        }
        // TODO: condition of tag, etc...

        var totalClause = KiiClause.and.apply(this, clauses);

        var query = (clauses.length > 0)
          ? KiiQuery.queryWithClause(totalClause)
          : KiiQuery.queryWithClause();
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
              me.totalPrice.perTag = calcTotalPerTag(me.accounts);
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
      save: function(account, onSuccess, onFailure){
        var me = this;
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(BUCKET_NAME_ACCOUNT);

        var obj = bk.createObject();
        obj.set("date", account.date);
        obj.set("name", account.name);
        obj.set("tags", account.tags);
        obj.set("price", account.price);

        var _onSuccess = function(theObject){
          // add created data to accounts.
          me.accounts.push({
            id: theObject.objectURI(),
            date: moment(account.date).format("YYYY-MM-DD"),
            name: account.name,
            tags: account.tags,
            price: account.price
          });

          me.totalPrice.all += account.price;

          _.each(account.tags, function(tagId){
            me.totalPrice.perTag[tagId] += account.price;
          });

          if (onSuccess) onSuccess();
        };
        var _onFailure = function(){
          if (onFailure) onFailure();
        }

        obj.save({
          success: _onSuccess,
          failure: _onFailure
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
            // calc totel per tag.
            _.each(removedAccount.data.tags, function(tagId){
              me.totalPrice.perTag[tagId] -= removedAccount.data.price;
            });
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
      },

      /**
       * sort by column data.
       * if "column" is same as sort-column, change direction.
       * otherwise, sort by "column" and direction is ascend.
       */
      sort: function(column){
        var me = this;
        if (me.sorted[column]) {
          me.sortDirection = !me.sortDirection;
        } else {
          _.each(me.sorted, function(v, k){
            me.sorted[k] = false;
          });
          me.sorted[column] = true;
          me.sortDirection = true;
        }

        // sort.
        me.accounts = _.sortBy(me.accounts, function(account){
          return account[column];
        });
        if (!me.sortDirection){
          me.accounts.reverse();
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
    $scope.tags = tagData.tags;
  }]);

  /**
   * range select controller.
   */
  app.controller("rangeSelectController", [ "$scope", "dateRange", function($scope, dateRange){
    $scope.range = dateRange;

    // watch range selected.
    // if changed, reload main table.
    $scope.$watch("range.selected", function(value, before){
      // ignore trigger when init.
      if (value !== before) {
        $scope.$parent.load();
      }
    });
  }]);

  /**
   * date range.
   */
  app.value("dateRange", {
    // consts.
    THIS_MONTH: 1,
    LAST_MONTH: 2,
    THIS_YEAR: 3,
    LAST_YEAR: 4,
    MANUAL_RANGE: 5,

    // html select options.
    options: [{
      num: 1,
      label: "This month"
    }, {
      num: 2,
      label: "Last month"
    }, {
      num: 3,
      label: "This year"
    }, {
      num: 4,
      label: "Last year"
    }, {
      num: 5,
      label: "Other"
    }],

    // properties.
    // selected range. default is "this month".
    selected: 1,

    // manual range.
    start: null,
    end: null,

    // methods.
    /**
     * generate condition object.
     */
    generateCondition: function(){
      var me = this;
      var startDate, endDate;
      switch(me.selected){
        case me.THIS_MONTH:
          (function(){
            var year = moment().year();
            var month = moment().month();
            startDate = moment([year, month, 1]).format("YYYY-MM-DD");
            endDate = moment([year, month, moment([year, month]).daysInMonth()]).format("YYYY-MM-DD");
          })();
          break;
      }

      var cond = {};
      if (startDate) cond.startDate = startDate;
      if (endDate) cond.endDate = endDate;

      return cond;
    }
  });

  /**
   * create account data controller.
   */
  app.controller("createDataController", [ "$scope", "accountData", "accountSave", "tagData", "addDataDialogUI", function($scope, accountData, accountSave, tagData, addDataDialogUI){
    $scope.account = accountSave;
    $scope.tags = tagData.tags;
    $scope.ui = addDataDialogUI;

    // methods.
    /**
     * create account data.
     *
     * @param {boolean} close close dialog or not after creating data.
     */
    $scope.create = function(close){
      var onSuccess = close ? function(){
        addDataDialogUI.close();
        $scope.$parent.$apply();
      } : function(){
        $scope.$parent.$apply();
      };
      accountData.save(accountSave.getValidData(), onSuccess);
    };

    // UI initialization.
    addDataDialogUI.init();
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
      _.each(me.tags, function(val, key){
        if (val) tags.push(key);
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
   * add data dialog UI depended code.
   */
  app.factory("addDataDialogUI", ["accountSave", function(accountSave){
    return {
      init: function(){
        // run on show add-data-modal.
        var jqAddModal = $("#addModal");
        jqAddModal.on("show.bs.modal", function(e){
          $("#add-data-date").datepicker({
            autoclose: true,
            format: "yyyy-mm-dd",
            language: "ja",
            todayHighlight: true
          });
        });

        // run on hide add-data-modal.
        jqAddModal.on("hidden.bs.modal", function(e){
          $("#add-data-date").datepicker("remove");
        });
      },

      toggleButton: function($event){
        var jqTagBtn = $($event.target);
        jqTagBtn.toggleClass("active");
        var tagId = jqTagBtn.attr("data-tag-id");
        accountSave.tags[tagId] = !accountSave.tags[tagId];
      },

      close: function(){
        $("#addModal").modal("hide");
      }
    };
  }]);

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
