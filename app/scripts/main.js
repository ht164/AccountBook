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

    // init chart.js
    Chart.defaults.global = _.extend(Chart.defaults.global, {
      responsive: true,
      scaleFontColor: "#222"
    });

    // display content.
    $("#content").css("display", "");
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
   * main area tab controller.
   */
  app.controller("mainAreaTabController", [ "$scope", function($scope){
    $scope.showTable = function(){
      $scope.$parent.tab = "table";
    };

    $scope.showGraph = function(){
      $scope.$parent.tab = "graph";
    };
  }]);

  /**
   * main table controller.
   */
  app.controller("mainTableController", [ "$scope", "accountData", "tagData", "dateRange", function($scope, accountData, tagData, dateRange){
    // properties.
    $scope.accountData = accountData;
    $scope.tags = tagData.tags;
    $scope.tab = "table";

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
      var tr = $($event.target).parentsUntil("table#account-data-table", "tr");
      var accountId = tr.attr("data-id");
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
          clauses.push(KiiClause.greaterThanOrEqual("date", new Date(cond.startDate)));
        }
        if (cond.endDate) {
          clauses.push(KiiClause.lessThanOrEqual("date", new Date(cond.endDate)));
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
            me.totalPrice.perTag[tagId] = (me.totalPrice.perTag[tagId] || 0) + account.price;
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
            var perTag = me.totalPrice.perTag;
            _.each(removedAccount.data.tags, function(tagId){
              perTag[tagId] -= removedAccount.data.price;
              if (perTag[tagId] === 0) {
                delete perTag[tagId];
              }
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
      tags_objectURI: {},

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
              me.tags_objectURI[id] = result.objectURI();
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
            me.tags_reverse[tag.name] = tagId;
            me.tags_objectURI[tagId] = theObject.objectURI();
            if (onSuccess) onSuccess();
          },
          failure: function(theObject, errorString){
            if (onFailure) onFailure();
          }
        });
      },

      /**
       * remove tag data from KiiCloud.
       * if success, remove tag data from me.tags, me.tags_reverse also.
       */
      remove: function(tagId, onSuccess, onFailure){
        var me = this;
        var obj = KiiObject.objectWithURI(me.tags_objectURI[tagId]);
        // if success, remove from me.tags, me.tags_reverse.
        var _onSuccess = function(){
          removedTagName = me.tags[tagId];
          delete me.tags[tagId];
          delete me.tags_reverse[removedTagName];
          delete me.tags_objectURI[tagId];

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
       * modify tag data.
       */
      modify: function(tagId, editInfo, onSuccess, onFailure){
        var me = this;
        var obj = KiiObject.objectWithURI(me.tags_objectURI[tagId]);
        // if success, change tag name of my properties.
        var _onSuccess = function(){
          var oldTagName = me.tags[tagId];
          me.tags[tagId] = editInfo.name;
          me.tags_reverse[editInfo.name] = me.tags_reverse[oldTagName];
          delete me.tags_reverse[oldTagName];

          if (onSuccess) onSuccess();
        };

        if (obj) {
          if (editInfo.name) obj.set("name", editInfo.name);

          obj.save({
            success: function(theObject){
              _onSuccess();
            },
            failure: function(theObject, errorString){
              if (onFailure) onFailure();
            }
          });
        } else {
          if (onFailure) onFailure();
        }
      }
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
      var startYear, endYear, startMonth, endMonth;
      var m = moment();
      var startDate, endDate;
      switch(me.selected){
        case me.LAST_MONTH:
          m.subtract(1, "months");
        case me.THIS_MONTH:
          startYear = endYear = m.year();
          startMonth = endMonth = m.month();
          break;

        case me.LAST_YEAR:
          m.subtract(1, "years");
        case me.THIS_YEAR:
          startYear = endYear = m.year();
          startMonth = 0;
          endMonth = 11;
          break;
      }
      startDate = moment([startYear, startMonth, 1]).format("YYYY-MM-DD");
      endDate = moment([endYear, endMonth, moment([endYear, endMonth]).daysInMonth()]).format("YYYY-MM-DD");

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
    $scope.state = addDataDialogUI.state;

    // methods.
    /**
     * create account data.
     *
     * @param {boolean} close close dialog or not after creating data.
     */
    $scope.create = function(close){
      var onSuccess = function(){
        addDataDialogUI.setStateToCreated(true);
        $scope.state = "created";
        if (close) addDataDialogUI.close();
        $scope.$parent.$apply();
      }
      addDataDialogUI.setStateToCreating();
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
      var price = me.price.replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s){
        return String.fromCharCode(s.charCodeAt(0) - 65248);
      });
      return {
        date: new Date(me.date),
        name: me.name,
        tags: tags,
        price: parseInt(price, 10)
      };
    }
  });

  /**
   * add data dialog UI depended code.
   */
  app.factory("addDataDialogUI", ["$timeout", "accountSave", function($timeout, accountSave){
    return {
      state: "none",

      init: function(){
        // run on show add-data-modal.
        var jqAddModal = $("#addModal");
        jqAddModal.on("show.bs.modal", function(e){
          $("#add-data-date-div").datetimepicker({
            format: "YYYY-MM-DD"
          });
        });

        // run on hide add-data-modal.
        jqAddModal.on("hidden.bs.modal", function(e){
          $("#add-data-date-div").datetimepicker("remove");
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
      },

      setStateToCreating: function(){
        this.state = "creating";
      },

      setStateToCreated: function(isSuccess){
        var me = this;
        me.state = isSuccess ? "created" : "failed";
        $timeout(function(){
          me.state = "none";
        }, 1500);
      }
    };
  }]);

  /**
   * edit tag controller
   */
  app.controller("editTagController", [ "$scope", "tagData", "tagSave", "tagEditSave", function($scope, tagData, tagSave, tagEditSave){
    $scope.tags = tagData.tags;
    $scope.newTag = tagSave;
    $scope.editTag = tagEditSave;

    // editting tag id.
    var edittingTagId = null;
    // old tag name.
    $scope.edittingTagNameOld = "";

    // set modal dialog behavior.
    $("#editTagInputModal").on("shown.bs.modal", function(){
      $("#editTagInputModal-name").focus();
    });

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

    /**
     * remove tag.
     * removed tag in account data still exists.
     * user has to modify account data to remove "removed tag".
     */
    $scope.remove = function(tagId){
      var onSuccess = function(){
        $scope.$apply();
      }
      tagData.remove(tagId, onSuccess);
    };

    /**
     * show edit tag dialog.
     */
    $scope.showEdit = function(tagId){
      edittingTagId = tagId;
      // set tag name to edit tag name dialog.
      $scope.edittingTagNameOld = tagEditSave.name = tagData.tags[tagId];
    };

    /**
     * edit tag.
     */
    $scope.edit = function(){
      var onSuccess = function(){
        $scope.$apply();
        $("#editTagInputModal").modal("hide");
      }
      tagData.modify(edittingTagId, tagEditSave.getValidData(), onSuccess);
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
   * edit tag name model.
   * TODO: this model is copy of "tagSave".
   */
  app.value("tagEditSave", {
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
     * logout and reload page (move to login form).
     */
    $scope.logout = function(){
      User.logout();
      location.replace("/");
    };
  }]);

  /**
   * graph area controller.
   */
  app.controller("graphAreaController", [ "$scope", "graphPricePerTag", "graphPricePerDate", function($scope, graphPricePerTag, graphPricePerDate){
    $scope.graph = graphPricePerTag;

    // watch
    // load data when main table appears.
    $scope.$watch($scope.$parent.tab, function(){
      if ($scope.$parent.tab == "graph") {
        graphPricePerTag.drawPieChart();
        graphPricePerDate.drawBarChart();
      }
    });
  }]);

  /**
   * graph: price per tag.
   * data is accountData.totalPrice.perTag
   * graph data is not connected to original data(perTag).
   */
  app.factory("graphPricePerTag", [ "accountData", "tagData", "graphColor", function(accountData, tagData, graphColor){
    var GRAPH_AREA_ID = "graph-drawing-area";

    // private methods.
    /**
     * generate data for drawing chart and label.
     * data source is accountData.totalPrice.perTag.
     */
    var generateDataForChart = function(){
      // converte hash-object to array.
      var priceArray = [];
      _.each(accountData.totalPrice.perTag, function(price, tagId){
        priceArray.push({
          id: tagId,
          price: price
        });
      });
      // sort.
      priceArray = _.sortBy(priceArray, function(tagPrice){
        // descend sort. larget price is upper rank.
        return 0 - tagPrice.price;
      });
      // create chart and label data.
      var chartData = [];
      var labelData = [];
      _.each(priceArray, function(tagPrice, index){
        chartData.push({
          value: tagPrice.price,
          label: tagData.tags[tagPrice.id],
          color: graphColor.getColor(index)
        });
        labelData.push({
          label: tagData.tags[tagPrice.id],
          color: graphColor.getColorClass(index)
        });
      });

      return {
        chart: chartData,
        label: labelData
      };
    };

    return {
      /**
       * drawn color and tag name.
       */
      drawnDataLabel: {},

      /**
       * draw pie chart.
       */
      drawPieChart: function(){
        var data = generateDataForChart();

        var ctx = $("#" + GRAPH_AREA_ID).get(0).getContext("2d");
        var chart = new Chart(ctx).Pie(data.chart, {});

        this.drawnDataLabel = data.label;
      }
    };
  }]);

  /**
   * graph color data.
   */
  app.value("graphColor", {
    colors: [
      "#E5004F", "#50E600", "#0050E6", "#E69500", "#00E695", "#9500E6"
    ],

    getColor: function(index){
      var _index = index % 6;
      return this.colors[_index];
    },

    getColorClass: function(index){
      var _index = index % 6 + 1;
      return "color-" + _index;
    }
  });

  /**
   * graph: price per date.
   * 
   * when range is "month", graph is per day.
   * when range is "year", graph is per month.
   * 
   * graph data is not connected to original data(perTag).
   */
  app.factory("graphPricePerDate", [ "accountData", "dateRange", function(accountData, dateRange){
    var GRAPH_AREA_ID = "graph-date-area";

    // private methods.
    /**
     * generate data for drawing chart.
     * data source is accountData.
     */
    var generateDataForChart = function(){
      // calc price per date.
      var data = gereratePriceDataPerDate();
      // generate data for chart.
      var labels = [];
      var dataInDatasets = [];
      for (var i = 1, n = data.length; i < n; i++){
        labels.push(i);
        dataInDatasets.push(data[i]);
      }

      return {
        labels: labels,
        datasets: [{
          fillColor: "rgba(151,187,205,0.5)",
          strokeColor: "rgba(151,187,205,0.8)",
          highlightFill: "rgba(151,187,205,0.75)",
          highlightStroke: "rgba(151,187,205,1)",
          data: dataInDatasets
        }]
      };
    };

    /**
     * gererate price data per date
     */
    var gereratePriceDataPerDate = function(){
      // init array.
      var numDataElements = 0;
      var selected = dateRange.selected;
      if (selected === 1) {
        numDataElements = moment().daysInMonth() + 1;
      } else if (selected === 2) {
        numDataElements = (moment().subtract(1, "months")).daysInMonth() + 1;
      } else if (selected === 3 || selected === 4) {
          numDataElements = 13;
      }
      var data = new Array(numDataElements);
      // zero clear.
      for (var i = 0; i < data.length; i++) data[i] = 0;

      // define each function.
      var _f;
      if (selected === 1 || selected === 2) {
        _f = function(account){
          // last 2 chars is day.
          var day = parseInt(account.date.substr(account.date.length - 2), 10);
          data[day] += account.price;
        };
      } else if (selected === 3 || selected === 4) {
        _f = function(account){
          // middle 2 chars is month.
          var month = account.date.substr(5, 2);
          data[month] += account.price;
        };
      }

      // calc price per date.
      _.each(accountData.accounts, _f);
      return data;
    };

    return {
      /**
       * draw bar chart.
       */
      drawBarChart: function(){
        var data = generateDataForChart();

        var ctx = $("#" + GRAPH_AREA_ID).get(0).getContext("2d");
        var chart = new Chart(ctx).Bar(data, {
          barValueSpacing: 2
        });
      }
    };
  }]);
})(app);
