/**
 * vim: tabstop=4
 *
 * @license    http://www.gnu.org/licenses/gpl.html GPL Version 3
 * @author     Ian Moore <imooreyahoo@gmail.com>
 * @author     Marcel Beck <marcel.beck@mbeck.org>
 * @copyright  Copyright (c) 2011 Ian Moore
 * @copyright  Copyright (c) 2012 Marcel Beck
 *
 * This file is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * This file is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this file. If not, see <http://www.gnu.org/licenses/>.
 *
 */
	// require("js/omv/NavigationPanel.js")
	// require("js/omv/data/DataProxy.js")
	// require("js/omv/FormPanelExt.js")
	// require("js/omv/form/SharedFolderComboBox.js")
	// require("js/omv/form/plugins/FieldInfo.js")
	// require("js/omv/util/Format.js")

Ext.ns("OMV.Module.Services");

// Register the menu.
OMV.NavigationPanelMgr.registerMenu("services", "website", {
	text:_("Website"),
	icon:"images/website.png"
});

/**
 * @class OMV.Module.Services.Website
 * @derived OMV.FormPanelExt
 */
OMV.Module.Services.Website = function (config) {
	var initialConfig = {
		rpcService:"Website"
	};
	Ext.apply(initialConfig, config);
	OMV.Module.Services.Website.superclass.constructor.call(this, initialConfig);
};
Ext.extend(OMV.Module.Services.Website, OMV.FormPanelExt, {

	initComponent:function () {
		OMV.Module.Services.Website.superclass.initComponent.apply(
						this, arguments);
		this.on("load", this._updateFormFields, this);
	},

	// Override submit callback to catch configtest errors
	cbSubmitHdl  :function (id, response, error) {
		OMV.MessageBox.updateProgress(1);
		OMV.MessageBox.hide();
		if (error === null) {

			// Check for response config error
			if (response && response.configfail) {

				OMV.MessageBox.error(_("Configuration Test Failed"), {'message':_("There was an error in the website's configuration, and it has been disabled to ensure the OpenMediaVault web interface continues to function. Please verify that any text entered in Extra Options contains valid configuration directives. Click Show details to view the configuration test result text."), 'trace':response.message});

				return;
			}
			this.fireEvent("submit", this);

		}
		else {
			OMV.MessageBox.error(null, error);
		}
	},

	getFormItems:function () {
		return [
			{
				xtype   :"fieldset",
				title   :_("General settings"),
				defaults:{
					labelSeparator:""
				},
				items   :[
					{
						xtype     :"checkbox",
						name      :"enable",
						fieldLabel:_("Enable"),
						checked   :false,
						inputValue:1,
						listeners :{
							check:this._updateFormFields,
							scope:this
						}
					},
					{
						xtype     :"sharedfoldercombo",
						name      :"sharedfolderref",
						hiddenName:"sharedfolderref",
						fieldLabel:_("Document root"),
						allowNone :false,
						width     :300,
						plugins   :[ OMV.form.plugins.FieldInfo ],
						infoText  :_("The location of the files to share. Permissions must be at least Users: read-only.")
					},
					{
						xtype        :"combo",
						name         :"vhosttype",
						fieldLabel   :_("Virtual host Type"),
						allowBlank   :false,
						plugins      :[ OMV.form.plugins.FieldInfo ],
						infoText     :_("In order to create a website that does not conflict with OpenMediaVault's web interface, this plugin will create a virtual host (a virtual website) in OpenMediaVault's web server.<Br /><br />In a <b>port based</b> virtual host configuration, the website configured here will be accessible at the same IP / name of this OpenMediaVault server, but on a different port. E.g. http://" + location.hostname + ":8500/. When using this type of configuration, be sure that the website port configured here is not the same port on which OpenMediaVault is running. This can be checked / changed in System -> General Settings.<Br /><br>In a <b>name based</b> virtual host configuration, the website configured here will be accessed as a different host name. E.g. http://some-host/. Where the name 'some-host' must resolve to the same IP address as OpenMediaVault. This usually requires that you have a DNS server on your network, or that a public DNS server has an entry for <b>some-host</b>.<br /><br />"),
						triggerAction:"all",
						mode         :"local",
						store        :new Ext.data.SimpleStore({
							fields:[ "value", "text" ],
							data  :[
								[ "port", _("Port based") ],
								[ "name", _("Name based") ]
							]
						}),
						displayField :"text",
						valueField   :"value",
						value        :"port",
						listeners    :{
							select:this._updateFormFields,
							scope :this
						}

					},
					{
						xtype        :"numberfield",
						name         :"port",
						fieldLabel   :_("Virtual host port"),
						width        :60,
						value        :8181,
						vtype        :"port",
						minValue     :0,
						maxValue     :65535,
						allowDecimals:false,
						allowNegative:false,
						allowBlank   :false
					},
					{
						xtype     :"textfield",
						fieldLabel:_("Virtual host hostname"),
						name      :"hostname",
						vtype     :"hostname",
						allowBlank:false
					}
				]
			},
			{
				xtype:"fieldset",
				title:_("Secure connection"),
				items:[
					{
						xtype     :"checkbox",
						name      :"enablessl",
						fieldLabel:_("Enable SSL/TLS"),
						checked   :false,
						inputValue:1,
						boxLabel  :_("Enable secure connection."),
						listeners :{
							check:this._updateFormFields,
							scope:this
						}
					},
					{
						xtype     :"certificatecombo",
						name      :"sslcertificateref",
						hiddenName:"sslcertificateref",
						fieldLabel:_("Certificate"),
						allowNone :false,
						allowBlank:false,
						plugins   :[ OMV.form.plugins.FieldInfo ],
						infoText  :_("The SSL certificate.")
					}
				]

			},
			{
				xtype   :"fieldset",
				title   :_("PHP"),
				defaults:{ xtype:"checkbox" },
				items   :[
					{
						name      :"ExecCGI",
						fieldLabel:_("Enable"),
						boxLabel  :_("Allow PHP scripts to be executed."),
						listeners :{
							check:this._updateFormFields,
							scope:this
						}
					},
					{
						xtype        :'combo',
						name         :'cgiuser',
						hiddenName   :'cgiuser',
						fieldLabel   :_("User"),
						emptyText    :_("Select a user ..."),
						valueField   :'name',
						displayField :'name',
						allowBlank   :true,
						allowNone    :true,
						editable     :false,
						autoWidth    :false,
						triggerAction:"all",
						store        :new OMV.data.Store({
							autoLoad  :true,
							remoteSort:false,
							proxy     :new OMV.data.DataProxy({"service":"UserMgmt", "method":"getUserList"}),
							reader    :new Ext.data.JsonReader({
								idProperty   :"name",
								totalProperty:"total",
								root         :"data",
								fields       :[
									{ name:"name" }
								]
							})
						}),
						plugins      :[ OMV.form.plugins.FieldInfo ],
						infoText     :_("For security reasons, PHP scripts will run as the selected user.")
					}
				]
			},
			{
				xtype   :"fieldset",
				title   :_("Options"),
				defaults:{ xtype:"checkbox" },
				items   :[
					{
						name      :"Indexes",
						fieldLabel:_("Indexes"),
						boxLabel  :_("If a URL which maps to a directory is requested, and there is no DirectoryIndex (e.g., index.html) in that directory, then a formatted listing of the directory will be returned.")
					},
					{
						name      :"FollowSymLinks",
						fieldLabel:_("Follow SymLinks"),
						boxLabel  :_("The server will follow symbolic links in the document root.")
					},
					{
						name      :"SymLinksIfOwnerMatch",
						fieldLabel:_("SymLinks If Owner Match"),
						boxLabel  :_("The server will only follow symbolic links for which the target file or directory is owned by the same user id as the link.")
					},
					{
						name      :"Includes",
						fieldLabel:_("Includes"),
						boxLabel  :_("Server-side includes are permitted.")
					},
					{
						name      :"MultiViews",
						fieldLabel:_("MultiViews"),
						boxLabel  :_("Content negotiated \"MultiViews\" are allowed.")

					}
				]

			},
			{
				xtype   :"fieldset",
				title   :_("Allow Override"),
				defaults:{ xtype:"checkbox" },
				items   :[
					{
						xtype:"panel",
						html :"Allow .htaccess files to override the items selcted below.<br /><br />"
					},
					{
						name      :"AuthConfig",
						fieldLabel:_("Auth Config"),
						boxLabel  :_("Authorization directives (AuthDBMGroupFile, AuthDBMUserFile, AuthGroupFile, AuthName, AuthType, AuthUserFile, Require, etc.).")
					},
					{
						name      :"OverrideIndexes",
						fieldLabel:_("Indexes"),
						boxLabel  :_("Directives controlling directory indexing (AddDescription, AddIcon, AddIconByEncoding, AddIconByType, DefaultIcon, DirectoryIndex, FancyIndexing, HeaderName, IndexIgnore, IndexOptions, ReadmeName, etc.).")
					},
					{
						name      :"Limit",
						fieldLabel:_("Limit"),
						boxLabel  :_("Directives controlling host access (Allow, Deny and Order).")
					},
					{
						name      :"Options",
						fieldLabel:_("Options"),
						boxLabel  :_("Directives controlling specific directory features (Options and XBitHack).")
					}
				]
			},
			{
				xtype     :"textfield",
				name      :"extraoptions",
				fieldLabel:_("Extra options"),
				hideLabel :true,
				allowBlank:true,
				autoCreate:{
					tag         :"textarea",
					autocomplete:"off",
					rows        :"10",
					cols        :"85"
				},
				plugins   :[ OMV.form.plugins.FieldInfo ],
				infoText  :_("Extra options for the &lt;VirtualHost&gt; directive.")
			}
		];
	},

	/**
	 * Private function to update the states of various form fields.
	 */
	_updateFormFields:function () {

		var field = this.findFormField("enable");
		var checked = field.checked;

		// if not enabled, no fields are required
		if (!checked) {
			this.getForm().applyToFields({allowBlank:true});
			this.getForm().clearInvalid();
		}

		var fields = [ "sharedfolderref", "vhosttype"];
		for (var i = 0; i < fields.length; i++) {
			field = this.findFormField(fields[i]);
			if (!Ext.isEmpty(field)) {
				field.allowBlank = !checked;
			}
		}

		var vhostType = this.findFormField("vhosttype").getValue();
		if (vhostType == "port") {
			this.findFormField("port").show();
			this.findFormField("port").allowBlank = false || !checked;
			this.findFormField("hostname").hide();
			this.findFormField("hostname").allowBlank = true;
		}
		else {
			this.findFormField("port").hide();
			this.findFormField("port").allowBlank = true;
			this.findFormField("hostname").show();
			this.findFormField("hostname").allowBlank = false || !checked;
		}

		this.findFormField("sslcertificateref").allowBlank = (!this.findFormField("enablessl").checked || !checked);
		this.findFormField("cgiuser").allowBlank = (!this.findFormField("ExecCGI").checked || !checked);

	}
});

/**
 * php.ini editor
 */
/**
 * @class OMV.Module.Services.Website
 * @derived OMV.FormPanelExt
 */
OMV.Module.Services.WebsitePHPINI = function (config) {
	var initialConfig = {
		rpcService  :"Website",
		rpcGetMethod:"getPhpIni",
		rpcSetMethod:"setPhpIni",
		layout      :"fit"
	};
	Ext.apply(initialConfig, config);
	OMV.Module.Services.WebsitePHPINI.superclass.constructor.call(this, initialConfig);
};
Ext.extend(OMV.Module.Services.WebsitePHPINI, OMV.FormPanelExt, {

	initComponent:function () {
		OMV.Module.Services.WebsitePHPINI.superclass.initComponent.apply(
						this, arguments);
	},

	getFormItems:function () {
		return [
			{
				xtype     :'textarea',
				name      :'phpini',
				allowBlank:false
			}
		]
	}
});

OMV.NavigationPanelMgr.registerPanel("services", "website", {
	cls     :OMV.Module.Services.Website,
	position:10,
	title   :_("Settings")
});

OMV.NavigationPanelMgr.registerPanel("services", "website", {
	cls     :OMV.Module.Services.WebsitePHPINI,
	position:20,
	title   :_("php.ini")
});

/**
 * Log files
 */

/**
 * @class OMV.Module.Diagnostics.LogPlugin.Website
 * @derived OMV.Module.Diagnostics.LogPlugin
 * Class that implements the 'Website' log file diagnostics plugin
 */
OMV.Module.Diagnostics.LogPlugin.Website = function (config) {
	var initialConfig = {
		title    :_("Website Access Log"),
		stateId  :"c9d06952-00da-11e1-aa29-Website",
		columns  :[
			{
				header   :_("Date & Time"),
				sortable :true,
				dataIndex:"date",
				id       :"date",
				width    :20,
				renderer :OMV.util.Format.localeTimeRenderer()
			},
			{
				header   :_("Host"),
				sortable :true,
				dataIndex:"host",
				width    :15
			},
			{
				header   :_("User"),
				sortable :true,
				width    :15,
				dataIndex:"user"
			},
			{
				header   :_("Event"),
				sortable :true,
				dataIndex:"event",
				id       :"event"
			}
		],
		rpcArgs  :{ "id":"websiteaccess" },
		rpcFields:[
			{ name:"date" },
			{ name:"host" },
			{ name:"user" },
			{ name:"event" }
		]
	};
	Ext.apply(initialConfig, config);
	OMV.Module.Diagnostics.LogPlugin.Website.superclass.constructor.call(
					this, initialConfig);
};
Ext.extend(OMV.Module.Diagnostics.LogPlugin.Website,
				OMV.Module.Diagnostics.LogPlugin, {
				});
OMV.preg("log", "websiteaccess", OMV.Module.Diagnostics.LogPlugin.Website);

/**
 * @class OMV.Module.Diagnostics.LogPlugin.Website-dhcp
 * @derived OMV.Module.Diagnostics.LogPlugin
 * Class that implements the 'Website' log file diagnostics plugin
 */
OMV.Module.Diagnostics.LogPlugin.Websiteerror = function (config) {
	var initialConfig = {
		title    :_("Website Error Log"),
		stateId  :"c9d06952-00da-11e1-aa29-Website-error",
		columns  :[
			{
				header   :_("Date & Time"),
				sortable :true,
				dataIndex:"date",
				id       :"date",
				width    :20,
				renderer :OMV.util.Format.localeTimeRenderer()
			},
			{
				header   :_("Severity"),
				sortable :true,
				dataIndex:"severity",
				id       :"severity",
				width    :20,
				renderer :function (val) {
					switch (val) {
						case 'error':
							return _('Error');
						case 'warn':
							return _('Warning');
						case 'info':
							return _('Info');
						case 'debug':
							return _('Debug');
					}
					return val;
				}
			},
			{
				header   :_("Event"),
				sortable :true,
				dataIndex:"event",
				id       :"event"
			}
		],
		rpcArgs  :{ "id":"websiteerror" },
		rpcFields:[
			{ name:"date" },
			{ name:"severity" },
			{ name:"event" }
		]
	};
	Ext.apply(initialConfig, config);
	OMV.Module.Diagnostics.LogPlugin.Websiteerror.superclass.constructor.call(
					this, initialConfig);
};
Ext.extend(OMV.Module.Diagnostics.LogPlugin.Websiteerror,
				OMV.Module.Diagnostics.LogPlugin, {
				});
OMV.preg("log", "websiteerror", OMV.Module.Diagnostics.LogPlugin.Websiteerror);

