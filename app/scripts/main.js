window.onload = function(){
    Kii.initializeWithSite("81a08656", "56ddb143a3f3be8365369d630ce650ea", KiiSite.JP);

    // trigger.
    $("#login-button").on("click", function(){
        AB.auth.login();
    });
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
     * login and move account book page.
     * fire when login button clicked.
     */
    login: function(){
      var username = $("#username").val();
      var password = $("#password").val();
      var onSuccess = function(user){
        // move to main page.
        window.location = "main.html";
      };
      var onFailure = function(user, errorString){
        // TODO: show error message
        console.log(errorString);
      };

      this.authenticateUser(username, password, onSuccess, onFailure);
    }
  },

  // about account book.
  book: {

  }
};


