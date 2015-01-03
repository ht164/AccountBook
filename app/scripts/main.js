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
        AB.main.initMainPage();
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
    /**
     * initialize main table.
     */
    initMainPage: function(){
      $("#main-table").css("display", "");
    }
  }
};


