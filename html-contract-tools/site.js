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
		
		//openpgp.initWorker("openpgp.worker.min.js");
		openpgp.config.show_comment = false;
		openpgp.config.show_version = false;
		
	    //By default, show the script generator
	    $("#page_generator").fadeIn({duration:500});
	    
	    app.forms.create_field_list();
	    
	    //If no keypair exist, prompt for one at startup,
	    if(localStorage.PGP_keypair === undefined) {
	        $("#popup_content").html($("#template_popup_pgp_load").html());
	        $("#popup_modal").modal("show");
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

app.pgp_file_load = function () {
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
};

// ======================== Contract Generation Functions ======================== 

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
	       return "The " + el.name + " field does not exist on the form, can not validate non-existant data";
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
	
	return {
		//Function to generate the contract
		create: function() {
		    //initialize an variable to hold an object array of values
		    var contract_values = {};
		    $("#form_gen_fields").find('input[name="gen_input_field[]"]').each(function(){
		        var id = $(this).attr('id');
		        contract_values[id] = $(this).val();
		    });
		    
		    //Check the contract values and get result to variable.
		    var checks = gen_check_con();
		    
		    //If the checks did not return true, 
		    if(checks!==true && checks !==undefined) {
		        $("#xml_contract").html(checks).show();
		    }
		    
		    //If all values are correct ,then show the sign and encrypt modal
		    else {
		        //get parsed data
		        var parsedValues = gen_parse_values(contract_values);
		        
		        $("#xml_contract").text(parsedValues).show();
		        $("#popup_content").html($("#input_sign_and_encrypt_PGP").html());
		        $("#popup_modal").modal('show').one("shown.bs.modal", function() {
		        	$("#pgp_pass").focus();
		        });
		        
		    }
		        
		},
		sign: function (){
		    //First, if the keypair is not set
			if(localStorage.PGP_keypair === undefined) {
		        //Show the popup to load the keypair
		        $("#popup_content").html($("#template_popup_pgp_load").html());
		        $("#popup_modal").modal("show");
		        return;
		    }

		    //Get the key to a val
		    var pgp_priv_key = openpgp.key.readArmored(JSON.parse(localStorage.PGP_keypair)[1]).keys[0];
		    var pgp_pub_key = openpgp.key.readArmored(JSON.parse(localStorage.PGP_keypair)[0]).keys[0];
		    
		    //Attempt to decrypt the public key
		    if(pgp_priv_key.decrypt($("#pgp_pass").val())){
		       
		        
		        //Sign the contract with the private key,
		        openpgp.signClearMessage([pgp_priv_key], $("#xml_contract").text()).then(function(pgpSignedContract){
		            //write the contract to the contract location
		            $("#xml_contract").text(pgpSignedContract);

		            //Set the modal back to blank, and remove all input fields
		            $("#popup_content").html("");
		            $("#form_gen_fields").html("");
		        	
		            $("#popup_modal").modal('hide');
		        });


		    }
		    //If the key decryption failes
		    else{
		       //notify the user
		       $("#decrypt_alert").html('<div class="alert alert-danger alert-dismissable">Failed to decrypt key, do you have the correct passphrase?</div>');
		    }
		},
		parse: function (){
			var val = $("#raw_contract").val();
			var armoredText;
			var output = [];
			
			try {
				armoredText = openpgp.cleartext.readArmored(val);
			} catch (e) {
				// not a great start. the armor is too damaged to sanely read it
				output.push("INVALID or DAMAGED contract: "+e.message);
			}
		    var pgp_pub_key = openpgp.key.readArmored(JSON.parse(localStorage.PGP_keypair)[0]).keys[0];
			
		    var text = "";
		    
		    if (armoredText) {
				openpgp.verifyClearSignedMessage(pgp_pub_key, armoredText).then(function(status) {
					console.log("Verified response:", status);
					if (status.signatures[0].valid) {
						output.push("Contract signature is valid.");
					} else {
						output.push("Contract signature is INVALID.");
					}
			    	parse_payload(armoredText.text);
				}).catch(function(e) {
			    	// an error here just means we can't verify the signature.
			    	// we can still inspect the plain-text and see if things make sense there.
			    	output.push("Signature verification failed: "+e.message);
			    	parse_payload(armoredText.text);
				});
		    } else {
		    	// remedial pseudo-parsing. The input is garbage, and opengpg won't even touch it, but we care, so we try.
		    	var match = val.match(/-----BEGIN PGP SIGNED MESSAGE-----[\r\n](?:[a-zA-Z0-9]+:.*?[\r\n])*((?:.*[\r\n]){2,})-----BEGIN PGP SIGNATURE-----/);
		    	output.push("Attempting to continue parsing in spite of damage:");
		    	parse_payload(match && match[1] || "");
		    }
		    
		    function parse_payload(text) {
		    	var obj = {};
		    	text = text.trim();
		    	switch (text.charAt()) {
		    	case '<':
		    		output.push("XML payload detected");
		    		try {
		    			var doc = $.parseXML("<contract>"+text+"</contract>");
		    			$("contract *", doc).each(function() {
		    				var $node = $(this);
		    				obj[$node.prop("tagName")] = $node.text();
		    			});
		    			
		    		} catch (e) {
		    			output.push("MALFORMED XML payload!");
		    		}
		    		break;
		    	case '{':
		    		output.push("JSON payload detected");
		    		try {
		    			obj = JSON.parse(text);
		    		} catch (e) {
		    			output.push("MALFORMED JSON payload!");
		    		}
		    		break;
		    	default:
		    		output.push("Formatted payload detected");
		    		$.each(text.split('\r\n'),function(index,line) {
		    			var fields = line.split(" : ");
		    			obj[fields[0]] = fields[1];
		    		});
		    	}
		    	output.push("parsed object: "+JSON.stringify(obj, null, 2));

		    	// TODO:
		    	// - loop through each known field.
		    	//   - if required, assert that they are present in obj.
		    	//   - if present, apply validation against value
		    	// - loop through each obj key
		    	//   - if not known field, warn about them.
		    	
		    	dump_output();
		    }
		    
		    function dump_output() {
		        $("#contract_output").text(output.join('\n')).show();
		    }
		}
		  

	};
}());





