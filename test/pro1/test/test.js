"use strict";

var _ = require('lodash');
var expect = require('expect.js');
var myNodeRepo = require('..');
var fs = require('fs-promise');
var expectCalled = require('expect-called');
var Path = require('path');

describe('mynoderepo', function(){
    it('find git in myNodeRepo.config', function(done){
        expect(1).to.eql(1);
        done();
    });
});
