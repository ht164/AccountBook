window.onload = function(){
    Kii.initializeWithSite("81a08656", "56ddb143a3f3be8365369d630ce650ea", KiiSite.JP);

    // if already logged in, show main table.
    // otherwise, show login form.
    if (KiiUser.getCurrentUser()) {
      AB.main.initMainPage();
    } else {
      AB.auth.initLoginPage();
    }

};

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

        // TODO: condition
        var query = KiiQuery.queryWithClause();
        var callbacks = {
          success: function(queryPerformed, resultSet, nextQuery){
            var accounts = [];
            _.each(resultSet, function(result){
              accounts.push({
                date: new Date(result.get("date")),
                name: result.get("name"),
                tags: result.get("tags"),
                price: result.get("price")
              });
            });
            // trigger "add" event.
            View.emit("add", accounts);
            if (nextQuery) {
              bk.executeQuery(nextQuery, callbacks);
            } else {
              me.calcTotalPrice();
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
       */
      load: function(){
      },

      /**
       * get tag name from id.
       */
      getName: function(id){
        return this.tags[id];
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

        // event handler
        var me = this;
        me.eventHandlers = {
          "add": function(){ me.addAccount.apply(me, arguments); },
          "total": function(){ me.showTotalPrice.apply(me, arguments); }
        };

        // button actions.
        $("#add-data-add").on("click", function(){
        });
        $("#add-data-add-inarow").on("click", function(){
            me.onClick_AddInARow();
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
            fragment += TagData.getName(tag) + " ";
          });
          fragment += "</td>";
          fragment += "<td>" + account.price + "</td>";
          fragment += "<td><button class='btn btn-default btn-xs'><span class='glyphicon glyphicon-remove'></span></button></td>";
          fragment += "</tr>";
        });

        table.append(fragment);
      },

      /**
       * show total price.
       */
      showTotalPrice: function(price){
        $("#total-price").html(price.toLocaleString());
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
        var price = parseInt($("#add-data-price").val(), 10);
        Controller.emit("add-data", {
            date: date,
            name: name,
            tags: tags,
            price: price
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
      /**
       * initialize
       */
      init: function(){
        AB.main.View.init();

        // event handler
        var me = this;
        me.eventHandlers = {
          "add-data": function(){ me.createAccountData.apply(me, arguments); }
        };

        // load tag data.
        this.loadTag();
        // load this month data.
        this.load();
      },

      /**
       * load tag data.
       */
      loadTag: function(){
        AB.main.TagData.load();
      },

      /**
       * load account data.
       */
      load: function(cond){
        var View = AB.main.View;
        var AccountData = AB.main.AccountData;
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


