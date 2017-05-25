(function () {
    "use strict";

    function UserEditController($scope, $timeout, $location, $routeParams, usersResource, contentEditingHelper, localizationService, notificationsService, mediaHelper, Upload, umbRequestHelper) {

        var vm = this;
        var localizeSaving = localizationService.localize("general_saving");

        vm.page = {};
        vm.user = {};
        vm.breadcrumbs = [];
        vm.avatarFile = {};

        vm.goToPage = goToPage;
        vm.openUserGroupPicker = openUserGroupPicker;
        vm.openContentPicker = openContentPicker;
        vm.openMediaPicker = openMediaPicker;
        vm.removeSelectedItem = removeSelectedItem;
        vm.disableUser = disableUser;
        vm.resetPassword = resetPassword;
        vm.getUserStateType = getUserStateType;
        vm.clearAvatar = clearAvatar;
        vm.save = save;
        vm.maxFileSize = Umbraco.Sys.ServerVariables.umbracoSettings.maxFileSize + "KB"
        vm.acceptedFileTypes = mediaHelper.formatFileTypes(Umbraco.Sys.ServerVariables.umbracoSettings.imageFileTypes);

        function init() {

            vm.loading = true;

            // get user
            usersResource.getUser($routeParams.id).then(function (user) {
                vm.user = user;
                makeBreadcrumbs(vm.user);
                vm.loading = false;
            });

        }

        function save() {

            vm.page.saveButtonState = "busy";

            contentEditingHelper.contentEditorPerformSave({
                statusMessage: localizeSaving,
                saveMethod: usersResource.saveUser,
                scope: $scope,
                content: vm.user,
                // We do not redirect on failure for users - this is because it is not possible to actually save a user
                // when server side validation fails - as opposed to content where we are capable of saving the content
                // item if server side validation fails
                redirectOnFailure: false,
                rebindCallback: function (orignal, saved) { }
            }).then(function (saved) {

                vm.user = saved;
                vm.page.saveButtonState = "success";

            }, function (err) {

                vm.page.saveButtonState = "error";

            });

        }

        function goToPage(ancestor) {
            $location.path(ancestor.path).search("subview", ancestor.subView);
        }

        function openUserGroupPicker() {
            vm.userGroupPicker = {
                title: "Select user groups",
                view: "usergrouppicker",
                selection: vm.user.userGroups,
                closeButtonLabel: "Cancel",
                show: true,
                submit: function (model) {
                    // apply changes
                    if (model.selection) {
                        vm.user.userGroups = model.selection;
                    }
                    vm.userGroupPicker.show = false;
                    vm.userGroupPicker = null;
                },
                close: function (oldModel) {
                    // rollback on close
                    if (oldModel.selection) {
                        vm.user.userGroups = oldModel.selection;
                    }
                    vm.userGroupPicker.show = false;
                    vm.userGroupPicker = null;
                }
            };
        }

        function openContentPicker() {
            vm.contentPicker = {
                title: "Select content start node",
                view: "contentpicker",
                multiPicker: true,
                show: true,
                submit: function (model) {
                    if (model.selection) {
                        vm.user.startNodesContent = model.selection;
                    }
                    vm.contentPicker.show = false;
                    vm.contentPicker = null;
                },
                close: function (oldModel) {
                    vm.contentPicker.show = false;
                    vm.contentPicker = null;
                }
            };
        }

        function openMediaPicker() {
            vm.contentPicker = {
                title: "Select media start node",
                view: "treepicker",
                section: "media",
                treeAlias: "media",
                entityType: "media",
                multiPicker: true,
                show: true,
                submit: function (model) {
                    if (model.selection) {
                        vm.user.startNodesMedia = model.selection;
                    }
                    vm.contentPicker.show = false;
                    vm.contentPicker = null;
                },
                close: function (oldModel) {
                    vm.contentPicker.show = false;
                    vm.contentPicker = null;
                }
            };
        }

        function removeSelectedItem(index, selection) {
            selection.splice(index, 1);
        }

        function disableUser() {
            alert("disable user");
        }

        function resetPassword() {
            alert("reset password");
        } 

        function clearAvatar() {
            // get user
            usersResource.clearAvatar(vm.user.id).then(function (data) {
              vm.user.avatars = data;
            });
        }

        function getUserStateType(state) {
            switch (state) {
                case "disabled" || "umbracoDisabled":
                    return "danger";
                case "pending":
                    return "warning";
                default:
                    return "success";
            }
        }

        $scope.changeAvatar = function (files, event) {
            if (files && files.length > 0) {
                upload(files[0]);
            }
        };

        function upload(file) {

            Upload.upload({
                url: umbRequestHelper.getApiUrl("userApiBaseUrl", "PostSetAvatar", { id: vm.user.id }),
                fields: {},
                file: file
            }).progress(function (evt) {

                //TODO: Do progress, etc...
                // set uploading status on file
                vm.avatarFile.uploadStatus = "uploading";

            }).success(function (data, status, headers, config) {

                // set done status on file
                vm.avatarFile.uploadStatus = "done";

                vm.user.avatars = data;

            }).error(function (evt, status, headers, config) {

                // set status done
                vm.avatarFile.uploadStatus = "error";

                // If file not found, server will return a 404 and display this message
                if (status === 404) {
                    vm.avatarFile.serverErrorMessage = "File not found";
                }
                else if (status == 400) {
                    //it's a validation error
                    vm.avatarFile.serverErrorMessage = evt.message;
                }
                else {
                    //it's an unhandled error
                    //if the service returns a detailed error
                    if (evt.InnerException) {
                        vm.avatarFile.serverErrorMessage = evt.InnerException.ExceptionMessage;

                        //Check if its the common "too large file" exception
                        if (evt.InnerException.StackTrace && evt.InnerException.StackTrace.indexOf("ValidateRequestEntityLength") > 0) {
                            vm.avatarFile.serverErrorMessage = "File too large to upload";
                        }

                    } else if (evt.Message) {
                        vm.avatarFile.serverErrorMessage = evt.Message;
                    }
                }
            });
        }


        function makeBreadcrumbs() {
            vm.breadcrumbs = [
                {
                    "name": "Users",
                    "path": "/users/users/overview",
                    "subView": "users"
                },
                {
                    "name": vm.user.name
                }
            ];
        }

        init();

    }

    angular.module("umbraco").controller("Umbraco.Editors.Users.UserController", UserEditController);

})();
