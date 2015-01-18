/* global describe, it */

describe("pageController", function(){
  beforeEach(module("ABApp"));

  var $controller;

  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
  }));

  describe("$scope.pageState", function(){
    it("is 'loginForm' at first.", function(){
      var $scope = {};
      var controller = $controller("pageController",{ $scope: $scope });
      expect($scope.pageState).to.equal("loginForm");
    });
  });

  describe("$scope.showMainTable", function(){
    it("sets pageState to 'mainTable'.", function(){
      var $scope = {};
      var controller = $controller("pageController",{ $scope: $scope });
      $scope.showMainTable();
      expect($scope.pageState).to.equal("mainTable");
    });
  });

  describe("$scope.showLoginForm", function(){
    it("sets pageState to 'loginForm'.", function(){
      var $scope = {};
      var controller = $controller("pageController",{ $scope: $scope });
      // change value of pageState before calling showLoginForm.
      $scope.pageState = "XXX";
      $scope.showLoginForm();
      expect($scope.pageState).to.equal("loginForm");
    });
  });
});
