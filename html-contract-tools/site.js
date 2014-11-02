// ======================== Data ========================
// 
// 



//Variable that contains possible form types, etc
var form_gen_types = [
    {name:'text',type:"text",class:""},
    {name:'nym', type:"text", class:"has-success", min_len:10 ,max_len:80 , regex_validation_rule:"", regex_validation_msg:"Failed to validate data, please re-enter"},
    {name:'btc_addr', type:"text", class:"has-success", min_len:26 ,max_len:33 , regex_validation_rule:"^[13][a-zA-Z0-9]{26,33}$", regex_validation_msg:"~field~ must be a valid bitcoin address."},
    {name:'currency',type:"text",class:"",regex_validation_rule:'^[0-9]+.?[0-9]+$',regex_validation_msg:"~field~ must be a valid currency value"},
    {name:'checkbox',type:"checkbox",class:""},
    {name:'textarea',type:"textarea",class:""},
    {name:'date',type:"datetime",class:"",regex_validation_rule:'^20[1-6][0-9]-[0-1]?[0-9]-[0-3][0-9] [0-2][0-9]:[0-5][0-9]:[0-5][0-9]$',regex_validation_msg:"~field~ must be a valid Date Time (eg 2015-11-23 12:33:11)"}    
];


//Variable that contains possible form types, etc
var form_gen_elements = {
    nym:{dataID:'nym_id',name:"Nym ID", type:'nym',required:true,single_field:true,default_value:"testnym"},
    btc_addr:{dataID:'btc_addr',name:"Your Bitcoin address",type:"btc_addr",required:true,single_field:true,default_value:"1P1GFYLWUhPzFazFKhp2ZHAzaBBKD6AKX1"},
    asset_name:{dataID:'asset_name',name:"Name of item to sell", type:"text",min_len:5,required:true,single_field:true,default_value:"1 french cat"},
    asset_price:{dataID:'asset_price',name:"Price (in BTC) of item to sell", type:"currency",required:true,single_field:true,default_value:"1.0"},
    contract_exp:{dataID:'contract_exp',name:"Offer expiry date", type:"date",required:true,single_field:true,default_value:"2014-07-22 12:00:00"}
};
    

// ======================== Main Document Functions ========================

var app = (function() {
	
	function init() {

		// this fails when loaded from a file: URI. openpgp degrades gracefully.
		try {
		    openpgp.initWorker("openpgp.worker.min.js");
		} catch (e) {}

		openpgp.config.show_comment = false;
		openpgp.config.show_version = false;
		
	    //By default, show the script generator
	    $("#page_generator").fadeIn({duration:500});
	    
	    app.forms2.create_type_list();
	    
	    //If no keypair exist, generate one. Hardcore people can upload their own keypair in the settings pane.
	    if(localStorage.PGP_keypair === undefined) {
	        app.pgp.generate(true);
	    }
	   
	   
	   //Set options to stored values
	    app.options.load();
	}
	
	return {
		run: function() {
			$(init);
		}
	};
}());

app.options = (function() {
	return {
		load: function() {
		    if (localStorage.options !== undefined){
		        //for each option
		        $.each(JSON.parse(localStorage.options), function(i,v) {
		            //Set the value of the div id for this index to its value
		            $("#"+i).val(v);
		        });
		    }
		},
		save: function(opt) {
		    //Prepare an array variable
		    var options = {};
		    
		    //if there is already local options stored,
		    if (localStorage.options !== undefined) {
		        //parse the data to the options var
		        options = JSON.parse(localStorage.options);
		    }
		    
		    
		    //Set the option into the array
		    options[opt]=$("#" + opt).val();
		    //Write all options back to local storage
		    localStorage.options = JSON.stringify(options);
		}
	};
}());

app.ui = (function() {
	return {
		//Function for managing the changes of pages/menu
		menu: function(div) {
		    //First remove all active elements from the menu
		    $(".nav_container li").removeClass("active");
		    
		    //Hide all the page sections, 
		    $('.page_wrap:not(:hidden)').fadeOut(function(){
		        //Once hide is completed, fade in the correct div
		        $('#'+div).fadeIn();
		        //Add the active class the the appropriate menu div
		        $("#menu_li_"+div).addClass("active");
		    });
		}
	};
}());

app.run();

// ======================== PGP Functions ======================== 
// 
// 
//  function for loading a PGP key

app.pgp = (function() {
    return {
        show_upload_modal: function () {
	        $("#popup_modal_pgp").modal("show").one("shown.bs.modal", function() {
                $("#pgp_key_pair").focus();
            });
        },
        file_load: function () {
            //Get the file to a var
            var file = $('#pgp_key_pair').get(0).files[0];

            //Create a file reader for reading the file
            var r = new FileReader();


            // Set the onload function for when the file has been read by the reader
            r.onload = function(f){
                //Store the PGP keys in temporary val

                var armoredkeys = f.target.result;
                var pub_key = armoredkeys.match(new RegExp('-----BEGIN PGP PUBLIC KEY BLOCK-----[\r\n](.*[\r\n]){2,}-----END PGP PUBLIC KEY BLOCK-----'))[0];
                var priv_key = armoredkeys.match(new RegExp('-----BEGIN PGP PRIVATE KEY BLOCK-----[\r\n](.*[\r\n]){2,}-----END PGP PRIVATE KEY BLOCK-----'))[0];

                //If either of the keys length is less than 100 than we did not get them
                if(pub_key.length < 100 || priv_key.length < 100){
                   console.log("failed to load keys");
                }
                //else store the keys
                else {
                    //Store the keys
                    localStorage.PGP_keypair = JSON.stringify([pub_key,priv_key]);
                    location.reload();
                }

            };

            //Read the file as a text
             r.readAsText(file);
        },
        generate: function(noReload) {
            // ridiculously insecure RSA keypair. cheap to generate. good for playing with the app, and not much else.
            openpgp.generateKeyPair({ numBits: 512, userId: "Test Contract Id" }).then(function(key){
                var pub_key = key.publicKeyArmored;
                var priv_key = key.privateKeyArmored;

                localStorage.PGP_keypair = JSON.stringify([pub_key, priv_key]);
                if (!noReload) {
                    location.reload();
                }
            });
        }
    };
}());

// stash those in a better namespace, maybe:
app.template = function(id, params) {
    var tmpl = $("#"+id).text();
    return tmpl.replace(/\{([^{}]*)\}/g,
        function (a, b) {
            var r = params[b];
            switch (typeof r) {
            case 'string': case 'number':
                return r;
            case 'function':
                return r();
            default:
                return a;
            }
        }
    );
};
app.alert = function(type, message, holder) {
    var msg = $(app.template("alert", {type:type, message:message}));
    if (!holder) {
        holder=  $("#notifier");
        setTimeout(function() {
            msg.alert('close');
        }, 5000);
    }
    holder.append(msg);
};

// ======================== Contract Generation Functions ======================== 

app.forms2 = (function () {
    // TODO: alternate implementation. uses tv4 schemas to extract fields for contracts of a given type.
    var schemas = tv4.getSchemaMap();
    var contract_types = Object.keys(schemas).filter(function(name){
        return schemas[name].contract;
    });

    var current_signed_contract = "";
    var current_name = "";
    var current_contract_type = "";
    var current_payload = "";
    var current_isDraft = false;

	//Function adds a link for a form element to the left menu for adding to the contract
	function add_link_line(name, schema){
	    $("#new_contract_menu").append("<li><a href='#' onclick='app.forms2.start_contract(\""+  name  +"\")'>" + schema.title + "</a></li>");
	}

	function add_contract_line(name, contract) {
	    $("#signed_contract_list").append("<li><a href='#'></a></li>");
	    $("#signed_contract_list > li > a:last").text(name).click(function() {
	        load_signed_contract(name, contract);
	    });
	}

	function add_draft_line(name, type, payload) {
	    $("#draft_contract_list").append("<li><a href='#'></a></li>");
	    $("#draft_contract_list > li > a:last").text(name).click(function() {
	        load_draft_contract(name, type, payload);
	    });
	}

	function load_signed_contract(name, contract) {
	    // convert contract into name+type
	    current_name = name;
        current_signed_contract = contract;
        current_isDraft = false;
        app.contract.parse(contract).then(function(parsed) {
            //XXX check the .valid* stuff, in case we have playful users.
            var type = parsed.contract_type;
            var payload = parsed.payload;

    	    // do pretty much exactly what load_draft_contract does.
    	    load_contract(name, type, payload, false);
        });
	}

	function load_draft_contract(name, type, payload) {
	    current_name = name;
	    current_contract_type = type;
	    current_payload = payload;
	    current_isDraft = true;
	    load_contract(name, type, payload, true);
	}

	function load_contract(name, type, payload, isDraft) {
	    // setup editor for "type"
	    app.forms2.start_contract(type);
	    // fill each field from payload, clicking "add" buttons as needed.
	    fill_values("contract", payload, $("#form_gen_fields > .panel"));
	    // show info bar above editor with "delete" button, which goes away on first edit/add/delete
	    $("#editor-notification").html(app.template("contract-loaded", {
	        name: name,
	        contract_kind: isDraft?"draft contract":"signed contract",
	        isDraft: isDraft?"true":"false"
	    }));
	}

	function fill_values(path, obj, panel) {
	    Object.keys(obj).forEach(function(key) {
	        // look for an `Add` button first.
	        var add_elt = $("> .panel-footer > #add_"+path.replace(/\./g, "-")+"-"+key+":visible", panel);
	        if (add_elt.length) {
	            add_elt.click();
	        }
	        // look for `key` in .panel-body
	        var elt = $("> .panel-body > [data-prop=\""+key+"\"]", panel);
	        if (elt.length) {
	            // found. set value.
	            switch (elt.attr("data-type")) {
	                case "object":
	                    fill_values(path+"."+key, obj[key], elt);
	                    break;
	                case "string":
	                    $("input", elt).val(obj[key]);
	                    break;
	                default:
	                    console.error("Unhandled type "+elt.attr("data-type")+" in fill_values()");
	            }
	        } else {
	            console.log("couldn't find > .panel-body > [data-prop=\""+key+"\"]", "in", panel);
	            console.error("Couldn't fill up "+path+"+"+key+" = "+obj[key]);
	        }
	    });
	}

	function gen_object(property, obj, path, canClose) {
	    var holder = $("<div data-type='object' data-prop='"+property+"' class='panel panel-default' >");
	    var heading = $("<div class='panel-heading'>");

	    holder.append(heading);
	    if (canClose) {
	        heading.append('<div class="btn-group pull-right"><button type="button" class="btn btn-danger">delete</button></div>');
	        $(".btn-danger", heading).click(function() {
	            // trash shelf.
	            holder.remove();
	            // show "add" button again
                var btn = $("#add_"+path.replace(/\./g,'-'));
                btn.show();
                $("#editor-notification .alert").alert("close");
	        });
	    } else {
	        heading.append('<div class="btn-group pull-right"><span class="btn btn-default disabled">required</span></div>');
	    }
	    var label = obj.title||obj.description||path.split(".").reverse()[0];
	    if (label) {
	        heading.append($("<h5>").text(label));
	    }
	    if (obj.title) {
	        holder.append();
	    }
	    var body = $("<div class='panel-body'>");
	    var footer = $("<div class='panel-footer'>");
	    var footerUsed = false;
	    if (obj.properties) {
            Object.keys(obj.properties).forEach(function(property) {

                var definition = obj.properties[property];
                var prop_path = path+"."+property;

                function renderProperty(canClose) {
                    if (definition.$ref) {
                        definition = schemas[definition.$ref];
                    }
                    switch (definition.type) {
                        case "object":
                            body.append(gen_object(property, definition, prop_path, canClose));
                            break;
                        case "string":
                        case "number":
                        case "array": // XXX Bad. but use a comma-separated string for now.
                            body.append(gen_string(property, definition, prop_path, canClose));
                            break;
                        default:
                            console.error("Unknown type:", definition);
                    }
                }

                if (obj.required && obj.required.indexOf(property)>-1) {
                    renderProperty();
                } else {
                    // optional..
                    var label = definition.title || definition.description || property;
                    var id = "add_"+prop_path.replace(/\./g,"-");
                    var el = $("<button type='button' id='"+id+"' class='btn btn-default'>Add "+label+"</button>");
                    el.click(function() {
                        el.hide();
                        renderProperty(true);
                        $("[id=\""+prop_path+"\"]").focus();
                        $("#editor-notification .alert").alert("close");
                    });
                    footer.append(el);
                    footerUsed = true;
                }
            });
        }
        holder.append(body);
        if (footerUsed) {
            holder.append(footer);
        }
	    return holder;
	}

	function gen_string(property, obj, path, canClose) {
        //Get the HTMl and prepare to add
        var label = obj.title || obj.description || path.split(".").reverse()[0];

        var inputHtml = app.template("form_input_template_text", {
            prop: property,
            field_id: path,
            fieldname: label,
            fieldtype: "text",
            datatype: obj.type
        });

        var el = $(inputHtml);
        if (canClose) {
            el.append("<div class='col-sm-3'><div class='btn btn-danger' >delete</div></div>");
            $(".btn-danger", el).click(function() {
	            // trash shelf.
	            el.remove();
	            // show "add" button again
                var btn = $("#add_"+path.replace(/\./g,'-'));
                btn.show();
                $("#editor-notification .alert").alert("close");
            });
        } else {
	        el.append('<div class="col-sm-3"><div class="btn btn-default disabled">required</div></div>');
        }
        if (obj.default) {
            $("input", el).val(obj.default);
        }
        return el;
	}

    // crawl the DOM, returns JSON.
	function produce_json(parent, el) {
	    var type = el.attr("data-type");
	    var prop = el.attr("data-prop");
	    switch (type) {
	        case "object":
                var obj = {};
                parent[prop] = obj;
                $("> .panel-body > [data-type]", el).each(function() {
                    produce_json(obj, $(this));
                });
                break;
	        case "string":
                var val = $("input", el).val();
                parent[prop] = val;
                break;
	        default:
	            console.error("Unhandled field type:", type, el[0]);
	    }
	    return parent;
	}

    return {
        get_contract_types: function() {
            return contract_types;
        },
        create_type_list: function() {
            // populate "new contract" drop-down
            $("#new_contract_menu").html("");
            contract_types.forEach(function(type){
		        //Add the link using this element details, and getting the type
		        add_link_line(type, schemas[type]);
		    });
		    // populate signed contracts
		    var contracts = app.store.get_contracts();
            $("#signed_contract_list").html("");
		    if (contracts.length) {
		        contracts.forEach(function(obj) {
		            add_contract_line(obj.name, obj.contract);
		        });
		    } else {
		        $("#signed_contract_list").append("<li class='text-muted'>nothing here</li>");
		    }

		    // populate draft contracts
		    var drafts = app.store.get_drafts();
            $("#draft_contract_list").html("");
            if (drafts.length) {
		        drafts.forEach(function(obj) {
		            add_draft_line(obj.name, obj.type, obj.payload);
		        });
		    } else {
		        $("#draft_contract_list").append("<li class='text-muted'>nothing here</li>");
            }

        },
        start_contract: function(type) {
            // clean out any previous contract fields
            $("#contract_editor").html($("#template_contract_editor").html());
            // start generating elements
            // XXX This is not going to support everything that json schema can handle. maybe later.
            var schema = schemas[type];
            $("#form_gen_fields").append(gen_object(type, schema, "contract"));
            $('#editorTab a:first').tab('show');

        },
        validate_contract: function() {
            var obj = produce_json({}, $("#form_gen_fields > div"));
            var contract_type = Object.keys(obj)[0];
            var payload = obj[contract_type];
            var isValid = tv4.validate(payload, tv4.getSchema(contract_type));
            if (isValid) {
                app.alert("success", "<strong>Nice!</strong> This contract is valid.");
            } else {
                app.alert("danger", "<strong>Error!</strong> in "+tv4.error.dataPath+": "+tv4.error.message);
            }
            $("#editor-notification .alert").alert("close");
        },
        save_draft_dialog: function() {
            $("#popup_modal_save_draft").modal('show').one("shown.bs.modal", function() {
                $("#draft_contract_name").focus();
            });
            $("#editor-notification .alert").alert("close");
        },
        save_draft: function(name) {
            $("#popup_modal_save_draft").modal("hide");
            var obj = produce_json({}, $("#form_gen_fields > div"));
            var contract_type = Object.keys(obj)[0];
            var payload = obj[contract_type];
            var isValid = tv4.validate(payload, tv4.getSchema(contract_type));
            // do we allow to save an invalid contract? maybe.
            app.store.save_draft(name, contract_type, payload);
            app.alert("success", "This contract has been <strong>saved as a draft.</strong>");
        },
        sign_contract: function() {
            var obj = produce_json({}, $("#form_gen_fields > div"));
            var contract_type = Object.keys(obj)[0];
            var payload = obj[contract_type];
            var isValid = tv4.validate(payload, tv4.getSchema(contract_type));
            if (!isValid) {
                app.alert("danger", "<strong>Error!</strong> in "+tv4.error.dataPath+": "+tv4.error.message);
                return;
            }
		    $("#xml_contract").text(JSON.stringify(payload)).show();
            app.contract.create(contract_type, payload).then(function(contract) {
                current_signed_contract = contract;
            });
            $("#editor-notification .alert").alert("close");
        },
        save_signed_contract_dialog: function(text) {
            if (text) {
                current_signed_contract = text;
            }
            $("#popup_modal_save_contract").modal('show').one("shown.bs.modal", function() {
                $("#signed_contract_name").focus();
            });
        },
        save_signed_contract: function(name) {
            $("#popup_modal_save_contract").modal("hide");
            app.contract.parse(current_signed_contract).then(function(parsed) {
                if (parsed.validSignature && parsed.validPayload) {
                    app.store.save_contract(name, current_signed_contract);
                } else {
                    app.alert("danger", "This contract is not valid, and <strong>cannot be saved.</strong>");
                }
            });
        },
        delete_contract: function() {
            // delete current contract from storage
            if (current_isDraft) {
                app.store.delete_draft(current_name, current_contract_type, current_payload);
            } else {
                app.store.delete_contract(current_name, current_signed_contract);
            }
            $("#editor-notification .alert").alert("close");
        },
        data_change: function(elt) {
            console.log("NOTE: Inspect ", elt," for changes..");
            $("#editor-notification .alert").alert("close");
        }
    };
}());

app.forms = (function () {

	//Function adds a link for a form element to the left menu for adding to the contract
	function add_link_line(finfo){
	    $("#form_gen_field_list").append("<li id='form_gen_add_" + finfo.dataID + "'><a href='#' onclick='app.forms.add_element(\""+  finfo.dataID  +"\")'>" + finfo.name + "</a></li>");
	}

	//Function checks all data validation rules in for the named element, 
	//Returns true if validation passed,
	//Returns array of errors if validation failed 
	//Returns false if elname not found in the array
	function data_validation(inputObj){
	    //Get the element details
	    var el = app.forms.get_element($(inputObj).attr("id"));
	    var re;
	    
	    //if el is false, return false
	    if(el===false || el===undefined) {
	        return false;
	    }
	    
	    //Make sure the object exists in the form
	    var dat = $(inputObj).html();
	    if(dat===undefined) {
	       return "The " + el.name + " field does not exist on the form, can not validate non-existent data";
	    }
	   
	    //Get the type for the field
	    var type = app.forms.get_type(el.type);
	    
	    //if not type, ,return false
	    if(type===false || type===undefined) {
	        return false;
	    }
	    
	    //Get the value to a var
	    var val = $(inputObj).val();
	    
	    //prepare a var for storing any error messages
	    var errors = [];
	    
	    //min_len:26
	    //max_len:33
	    //regex_validation_rule:"^[13][a-zA-Z0-9]{26,33}$"
	    //regex_validation_msg:"~field~ must be a valid bitcoin address."}
	   
	    //if min lenght is set on the element, check it
	    if(el.min_len !==undefined){
	        
	        //Check the value
	        if(val < el.min_len) {
	            errors.push(el.name + " must be at least " + el.min_len + " characters long \r\n");
	        }
	    }
	    //Else check if the type has a minimum length
	    else if(type.min_len !==undefined){
	        //Check the value
	        if(val < type.min_len) {
	            errors.push(el.name + " must be at least " + type.min_len + " characters long \r\n");
	        }
	    }
	   
	    //if element max length is set, 
	    if(el.max_len !==undefined){
	        //Check the value
	        if(val > el.max_len) {
	            errors.push(el.name + " must be less than or equal to " + el.min_len + " characters long \r\n");
	        }
	    }
	   
	    //else if the type max length is set, 
	    else if(type.max_len !==undefined){
	        //Check the value
	        if(val > type.max_len) {
	            errors.push(el.name + " must be less than or equal to " + type.min_len + " characters long \r\n");
	        }
	    }
	   
	    //If element regex is set
	    if(el.regex_validation_rule !==undefined){
	        re = new RegExp(el.regex_validation_rule,'i');
	        
	        if(re.test(val)===false) {
	            errors.push(el.regex_validation_msg.replace("~field~",el.name)+". Invalid match " + val + "\r\n");
	        }
	    }
	    //else if the type regex is set
	    if(type.regex_validation_rule !==undefined){
	        re = new RegExp(type.regex_validation_rule,'i');
	        
	        if(re.test(val)===false) {
	            errors.push(type.regex_validation_msg.replace("~field~",el.name)+"  Invalid match " + val + "\r\n");
	        }
	    }
	    
	    if(errors.length < 1) {
	        return true;
	    }
	    return errors;
	}
	return {
		//Function creates list of possible form elements for the generate contracts page
		create_field_list: function () {
		    $.each(form_gen_elements,function(c,o){
		        //Add the link using this element details, and getting the type
		        add_link_line(o);
		    });
		},
		//Function returns form gen type data
		get_type: function (type) {
		    var gen_type_obj ;
		    $.each(form_gen_types,function(co,t){
		        if(type===t.name) {
		            gen_type_obj = form_gen_types[co];
		        }
		    });
		    
		    if(gen_type_obj!==undefined) {
		        return gen_type_obj;
		    }
		    else {
		        console.log("Could not find element type" + type);
		    }
		},
		//Function returns form gen type data
		get_element: function (elementname) {
		    var gen_el_obj;
		    
		    //For each element in the array
		    $.each(form_gen_elements,function(c,e){
		        //If the element name === the element type, set the var as this element
		        if(elementname===e.dataID) {
		            gen_el_obj = form_gen_elements[c]; // XXX = e?
		        }
		        
		    });
		    
		    if(gen_el_obj!==undefined) {
		        return gen_el_obj;
		    }
		    else {
		        console.log("Could not find element " + elementname);
		    }
		},
		//Adds a clicked element from the left menu to the contract
		add_element: function (elname) {
		    //Get the element from the array, and the type
		    var element = app.forms.get_element(elname);
		    var type = app.forms.get_type(element.type);
		    
		    //Check if this element only allows a single field (on instance of this element)
		    if(element.single_field===true){
		        //If the element already exists (eg the HTML is not undefined)
		        if($("#"+element.dataID).html() !== undefined){
		            //Show an alert, and return nothing to exit the function
		            alert("This field is not allowed to be added twice to a contract");
		            return;
		        }
		    }
		    
		    
		    //Get the HTMl and prepare to add
		    var inputHtml = $("#form_input_template_"+type.type).html();
		    
		    //If the HTMl is undefined, it means there is no template HTML set for this kind of field
		    if(inputHtml === undefined) {
		        console.log("Error getting template input format #form_input_template_"+type.type);
		    }
		    
		    //Replace the various elements of the html
		    inputHtml = inputHtml.replace("field_id",element.dataID).replace("field_id",element.dataID).replace("fieldname",element.name).replace("fieldtype",type.type);
		    
		    
		    //Append the HTML to the generator fields
		    $("#form_gen_fields").append(inputHtml);
		    
		    //Add any classes to this field if needed
		    $("#form_gen_fields :last div input").addClass(type.class);
		    
		    //If a default value is set, set it in the input feild
		    if(element.default_value !== undefined) {
		        $("#form_gen_fields").children(":last").children('div').children('.form_gen_input').val(element.default_value);
		    }
		        
		},
		//Deletes a contract item from the current contract
		del_element: function (cel) {
	        $(cel).parent().parent().remove();
		},
		//This function should be fired whenever a form data is changed, 
		//Runs validation wizard and reports any errors
		//Starts by getting the result of the data_validation to a variable
		//If the validation is true, we change the color of the input field to green using the gne_form_input_msg function
		// If validation is an array, it means it errored, we set the mssages using the same function
		//Else if we did not get anything, nothing is right, all validation's should return something (ether, true, false or an array);
		data_change: function (obj){
		    //run the validation function
		    var validation = data_validation(obj);
		    
		    //log an entry so we can see what is happening
		    //If the result is false, something failed spectaculy,
		    if (validation===false){
		        alert("Error validating Data, please make sure there are no modifications to the code");
		    }
		    else if (validation===true){
		        app.forms.input_msg(obj,'','success');
		        return true;
		    }
		    //else if the result is an array
		    else if(Object.prototype.toString.call(validation) === '[object Array]' ){
		        app.forms.input_msg(obj,validation.join(),'error');
		        return validation.join("<br>");
		    }
		    //else alert that something went wrong, 
		    alert("something went wrong validating the data");
		},
		//Function modifies the display parameters of each form element
		input_msg: function (element,msgTxt,status){
		    //if Status is success, warning, error, or false
		    
		    //For ease of coding, get the parent object to a var
		    var par = $(element).parent().parent();
		    //first, remove any classes that may exist on this obj
		    par.removeClass("has-error has-warning has-success");
		    
		    //If there is a helper, remove it
		    $(par).children(".help-block").remove();
		    
		    //append a help block
		    $(par).append('<span class="help-block">'+msgTxt+'</span>');
		    
		    //if the status is not false, set the new class
		    if(status!==false) {
		        $(par).addClass("has-"+status);
		    }
		    
		    
		}

	};
}());

app.contract = (function() {
	//Function parses all variables into a particular type (eg JSON, XML, etc) and returns a string of the parsed values
	function gen_parse_values(v){
	    
	    //get the type from the drop down box
	    var type=$("#option_contract_format").val();
	    var resultData;
	    
	    switch (type) {
	    	case "XML":
	    		// leverage jQuery to build XML fragment safely
	    		var contract = $("<contract/>");
	    		$.each(v, function(index, value) {
	    			var node = $("<"+index+" />");
	    			node.text(value);
	    			contract.append(node);
	    		});
	            resultData = contract.html();
	            break;
	    	case "JSON":
	    		resultData = JSON.stringify(v);
	    		break;
	        default:
	            // XXX how should "value" be escaped here?
	            resultData = $.map(v, function( value, index ) {
	            	return index + " : " + value;
	            }).join('\r\n');
	    }
	    
	    //Once completed, return result data
	    return resultData;
	}

	//function to check the submitted contract fields
	//
	// Calls gen_check_inputs_required function, which 
	function gen_check_con(){
	    //Check if all required inputs are present
	    var required_inputs_check = gen_check_inputs_required();
	    
	    //Prepare an array for storing the result of checking all values
	    var valid_checks = [];
	    //for each input that is present, Run the validation check
	    $("#form_gen_fields").find('input[name="gen_input_field[]"]').each(function(){
	        //Change the form appearance
	        var res = app.forms.data_change(this);
	        
	        //If the result is not true, then add it to the errors list
	        if(res!==true) {
	            valid_checks.push(res);
	        }
	    });
	    
	    
	    
	    //If we have errors in the required_inputs_check result, return text/html error
	    if(required_inputs_check.length > 0) {
	        return "Not all required fields are present : <p> " + required_inputs_check.join("<br>") + "</p>";
	    }
	    
	    
	    //If we have errors in the valid_checks result, return text/html error
	    else if(valid_checks.length > 0 ) {
	        return "Found some errors with Fields :<p> " + valid_checks.join("<br>") + "</p>";
	    }
	    
	    return true;	        
	}

	function gen_check_inputs_required(){
	    //Prepare a var for storing messages in 
	    var msgs = [];
	    
	    //For each available input field,
	     $.each(form_gen_elements,function(c,el){
	         var dat = $("#"+el.dataID).html();
	         
	         //If the field does not exist in the html form
	         if(dat===undefined) {
	             if(el.required===true) {
	                //add the error to the array
	                msgs.push("You must include the " + el.name + " field in your contract");
	             }
	         }
	    });
	    //If the msgs string is set, return it, 
	    if(msgs.length >= 1) {
	        return msgs;
	    }
	    return true;
	}

    function signContract(resolve) {
        var pgp_priv_key = openpgp.key.readArmored(JSON.parse(localStorage.PGP_keypair)[1]).keys[0];

        //Attempt to decrypt the public key
        if(pgp_priv_key.decrypt($("#pgp_pass").val())){

            $("#pgp_pass").val("");
            var payload = JSON.parse($("#xml_contract").text());

            payload.Seller = payload.Seller || {};
            payload.Seller.seller_PGP = JSON.parse(localStorage.PGP_keypair)[0];

            //Sign the contract with the private key,
            openpgp.signClearMessage([pgp_priv_key], JSON.stringify(payload)).then(function(pgpSignedContract){
                $("#popup_modal_passphrase").modal('hide');
                resolve(pgpSignedContract);

                //write the contract to the contract location
                $("#xml_contract").text(pgpSignedContract);
                $("#save_signed_btn").removeClass("disabled");
                $('#editorTab a#contract-tab').tab('show');
            });


        }
        //If the key decryption fails
        else{
           //notify the user
           $("#decrypt_alert").html('<div class="alert alert-danger alert-dismissable">Failed to decrypt key, do you have the correct passphrase?</div>');
        }
    }

	return {

		//Function to generate the contract
		create: function(type, payload) {
		    // in this incarnation, this assumes validation happened elsewhere, and we're good to go.
		    // try to decrypt private key without passphrase
		    var pgp_priv_key = openpgp.key.readArmored(JSON.parse(localStorage.PGP_keypair)[1]).keys[0];
		    var needs_passphrase = !pgp_priv_key.decrypt("");

            return new Promise(function(resolve, reject) {
                if (needs_passphrase) {
                    $("#popup_modal_passphrase").modal('show').one("shown.bs.modal", function() {
                        $("#pgp_pass").focus();
                        $("#passphrase_form").one("submit", function(event) {
                            event.preventDefault();
                            signContract(resolve);
                        });
                    });
                } else {
                    signContract(resolve);
                }
            });
		},
		parse: function (text){
			var armoredText;
			var pgp_pub_key;
			var output = [];
			var hasValidSignature = false;
			var hasValidPayload = false;
			return new Promise(function(resolve, reject) {

                try {
                    armoredText = openpgp.cleartext.readArmored(text);
                } catch (e) {
                    // not a great start. the armor is too damaged to sanely read it
                    output.push("INVALID or DAMAGED contract: "+e.message);
                }

                var payload = {};

                if (!armoredText) {
                    // remedial pseudo-parsing. The input is garbage, and opengpg won't even touch it, but we care, so we try.
                    var match = text.match(/-----BEGIN PGP SIGNED MESSAGE-----[\r\n](?:[a-zA-Z0-9]+:.*?[\r\n])*((?:.*[\r\n]){2,})-----BEGIN PGP SIGNATURE-----/);
                    output.push("Attempting to continue parsing in spite of damage:");
                    armoredText = new openpgp.cleartext.CleartextMessage(match && match[1] || "");
                }

                // parse payload now. we need a pgp key to verify the signature against
                try {
                    payload = JSON.parse(armoredText.text.replace(/^- /gm,'').replace(/[\r\n]+/g,''));
                    pgp_pub_key = payload && payload.Seller && openpgp.key.readArmored(payload.Seller.seller_PGP).keys[0];
                } catch (e) {
                    output.push("MALFORMED JSON payload!");
                }
                window.payload = payload; // XXX remove me

                if (!pgp_pub_key) {
                    output.push("No valid Seller PGP key found. Cannot verify contract signature.");
                    validate_payload(payload);
                } else {
                    openpgp.verifyClearSignedMessage(pgp_pub_key, armoredText).then(function(status) {
                        if (status.signatures[0].valid) {
                            output.push("Contract signature is valid.");
                            hasValidSignature = true;
                        } else {
                            output.push("Contract signature is INVALID.");
                        }
                        validate_payload(payload);
                    }).catch(function(e) {
                        // an error here just means we can't verify the signature.
                        // we can still inspect the plain-text and see if things make sense there.
                        output.push("Signature verification failed: "+e.message);
                        validate_payload(payload);
                    });
                }

                function validate_payload(payload) {

                    var contract_types = app.forms2.get_contract_types();
                    var contract_type;
                    var isValid = contract_types.some(function(type) {
                        contract_type = type; // stash, in case we validate against it.
                        return tv4.validate(payload, tv4.getSchema(type));
                    });

                    if (isValid) {
                        output.push("Payload appears to be a valid contract of type " + contract_type);
                        hasValidPayload = true;
                    } else {
                        output.push("Contract payload is INVALID.");
                        output.push("Validation error in "+tv4.error.dataPath+": "+tv4.error.message);
                    }

                    resolve({
                        validSignature: hasValidSignature,
                        validPayload: hasValidPayload,
                        messages: output,
                        payload: payload,
                        contract_type: contract_type
                    });
                }
		    });
        },
        parse_and_dump: function() {
            var val = $("#raw_contract").val();
            app.contract.parse(val).then(function(parsed) {
                $("#contract_output").text(parsed.messages.join('\n')).show();
                $("#import_contract_btn").toggleClass("disabled", !(parsed.validSignature && parsed.validPayload));
            });
        },
        import: function() {
            app.forms2.save_signed_contract_dialog($("#raw_contract").val());
        }
	};
}());

app.store = (function() {

    return {
        save_draft: function(name, type, payload) {
            var drafts = app.store.get_drafts();
            drafts.push({name: name, type: type, payload: payload});
            localStorage.setItem("drafts", JSON.stringify(drafts));
            // update the list in the DOM
    	    app.forms2.create_type_list(true);
        },
        delete_draft: function(name, type, payload) {
            var drafts = app.store.get_drafts();
            var to_find = JSON.stringify({name: name, type: type, payload: payload });
            for (var i=0; i<drafts.length; i++) {
                if (JSON.stringify(drafts[i]) == to_find) {
                    drafts.splice(i,1);
                    localStorage.setItem("drafts", JSON.stringify(drafts));
                    // update the list in the DOM
                    app.forms2.create_type_list(true);
                    return;
                }
            }
        },
        get_drafts: function() {
            var drafts = [];
            try {
                drafts = JSON.parse(localStorage.getItem("drafts")) || [];
            } catch (e) { /* nobody cares */ }
            return drafts;
        },
        save_contract: function(name, contract) {
            var contracts = app.store.get_contracts();
            contracts.push({name: name, contract: contract});
            localStorage.setItem("contracts", JSON.stringify(contracts));
            // update the list in the DOM
    	    app.forms2.create_type_list(true);
        },
        delete_contract: function(name, contract) {
            var contracts = app.store.get_contracts();
            var to_find = JSON.stringify({name: name, contract: contract});
            for (var i=0; i<contracts.length; i++) {
                if (JSON.stringify(contracts[i]) == to_find) {
                    contracts.splice(i,1);
                    localStorage.setItem("contracts", JSON.stringify(contracts));
                    // update the list in the DOM
                    app.forms2.create_type_list(true);
                    return;
                }
            }
        },
        get_contracts: function() {
            var contracts = [];
            try {
                contracts = JSON.parse(localStorage.getItem("contracts")) || [];
            } catch (e) { /* still nope */ }
            return contracts;
        }
    };

}());





