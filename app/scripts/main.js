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
    /**
     * authenticate user.
     */
    authenticateUser: function(username, password, onSuccess, onFailure){
      KiiUser.authenticate(username, password, {
        success: onSuccess,
        failure: onFailure
      });
    },

    /**
     * authenticate user using access token.
     */
    authenticateByToken: function(token, onSuccess, onFailure){
        // TODO:
    },

    /**
     * initialize login page.
     */
    initLoginPage: function(){
      $("#login-button").on("click", function(){
        AB.auth.login();
      });

      $("#login-form").css("display", "");
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

      // consts.
      BUCKET_NAME_ACCOUNT: "account",

      // methods
      /**
       * load from KiiCloud.
       */
      load: function(cond, callback, errCallcack){
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(this.BUCKET_NAME_ACCOUNT);

        // TODO: condition
        var query = KiiQuery.queryWithClause();
        var callbacks = {
          success: function(queryPerformed, resultSet, nextQuery){
            //for (var i = 0; i < resultSet.length; i++) {
            //  // TODO:
            //}
            callback(resultSet);
            if (nextQuery) {
              bk.executeQuery(nextQuery, callbacks);
            }
          },
          failure: function(queryPerformed, errorString){
            // TODO:
          }
        };

        bk.executeQuery(query, callbacks);
      },

      /**
       * save 1 data to KiiCloud.
       */
      save: function(account){
        var user = KiiUser.getCurrentUser();
        var bk = user.bucketWithName(this.BUCKET_NAME_ACCOUNT);

        var obj = bk.createObject();
        obj.set("name", "NAME");
        obj.set("tags", [1, 2, 3]);
        obj.set("price", 1000);

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
        return tags[id];
      }
    },

    // view.
    View: {
      /**
       * initialize
       */
      init: function(){
        $("#main-table").css("display", "");
      },

      /**
       * add account data to bottom of table.
       */
      addAccount: function(accounts){
        var table = $("#main-table table");
        var TagData = AB.main.TagData;

        var fragment = "";
        _.each(accounts, function(account){
          fragment += "<tr data-id='" + account.id + "'>";
          fragment += "<td>" + account.name + "</td>";
          fragment += "<td>"; 
          _.each(account.tags, function(tag){
            fragment += TagData.getName(tag) + " ";
          });
          fragment += "</td>";
          fragment += "<td>" + account.price + "</td>";
          fragment += "</tr>";
        });

        table.append(fragment);
      }
    },

    // controller.
    Controller: {
      /**
       * initialize
       */
      init: function(){
        AB.main.View.init();

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
        var onSuccess = function(partAccounts){
          View.addAccount(partAccounts);
        };
        var onFailure = function(){
          // TODO: show error.
        }
        AccountData.load(cond, onSuccess, onFailure);
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


