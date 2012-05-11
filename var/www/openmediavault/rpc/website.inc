<?php
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

require_once("openmediavault/object.inc");
require_once("openmediavault/error.inc");
require_once("openmediavault/util.inc");
require_once("openmediavault/rpc.inc");
require_once("openmediavault/notify.inc");

class WebsiteRpc extends OMVRpc {

	const xpathRoot = '//services/website';

	public function __construct()
	{

		$this->methodSchemata = array(

			"set"       => array(
				'{
				"type":"object",
				"properties":{
					"enable":{"type":"boolean"},
					"sharedfolderref":{"type":"string","optional":true},
					"vhosttype":{"type":"string","enum":["port","name"]},
					"port":{"type":"integer","optional":true},
					"hostname":{"type":"string","optional":true},
					"enablessl":{"type":"boolean"},
					"sslcertificateref":{"type":"string","optional":true},
					"cgiuser":{"type":"integer","optional":true},
					"extraoptions":{"type":"string","optional":true},
					"ExecCGI":{"type":"boolean"},
					"Indexes":{"type":"boolean"},
					"FollowSymLinks":{"type":"boolean"},
					"SymLinksIfOwnerMatch":{"type":"boolean"},
					"Includes":{"type":"boolean"},
					"MultiViews":{"type":"boolean"},
					"AuthConfig":{"type":"boolean"},
					"OverrideIndexes":{"type":"boolean"},
					"Limit":{"type":"boolean"},
					"Options":{"type":"boolean"}
				}
			}'
			),
			"setPhpIni" => array(
				'{
				"type":"object",
				"properties" : {
					"phpini" : {"type":"string"}
				}
			}'
			)

		);
	}

	/**
	 * Safe config getting
	 */
	public function __call($name, $args)
	{

		// Configuration methods
		if (substr($name, 0, 6) == 'config')
		{

			// Correct method name
			$name = substr($name, 6);
			$name[0] = strtolower($name[0]);

			global $xmlConfig;
			$object = call_user_func_array(array($xmlConfig, $name), $args);
			switch ($name)
			{
				case 'delete':
					if ($object === false)
					{
						throw new OMVException(OMVErrorMsg::E_CONFIG_OBJECT_NOT_FOUND, $args[0]);
					}
					break;
				case 'save':
					if ($object === false)
					{
						throw new OMVException(OMVErrorMsg::E_CONFIG_SAVE_FAILED, $xmlConfig->getError());
					}
					break;
				case 'set':
				case 'replace':
				if ($object === false)
				{
					throw new OMVException(OMVErrorMsg::E_CONFIG_SET_OBJECT_FAILED);
				}
					break;
				default:
					if (is_null($object))
					{
						throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED, $args[0]);
					}
			}

			return $object;

		}
		throw new Exception("Method " . __CLASS__ . "::" . $name . " does not exist.");
	}

	/**
	 * Verify that the current user is an admin, and validate method args
	 */
	function _validate($mname = '', $args = array())
	{

		// Check permissions
		$this->validateSession();
		if (!$this->hasRole(OMV_ROLE_ADMINISTRATOR))
		{
			throw new OMVException(OMVErrorMsg::E_RPC_SERVICE_INVALID_PERMISSION);
		}
		$this->commitSession();

		// Check incoming data
		if ($mname)
		{
			$this->validateParams($mname, $args);
		}
	}

	/**
	 * Get all configuration data for service.
	 *
	 * @return array configuration data
	 */
	function get()
	{

		// Validation
		$this->_validate();

		//Get configuration object
		$object = $this->configGet(self::xpathRoot);

		// Modify result data
		foreach (array("enable", "enablessl", "ExecCGI", "Indexes", "FollowSymLinks", "SymLinksIfOwnerMatch", "Includes", "MultiViews", "AuthConfig", "OverrideIndexes", "Limit", "Options")
						 as $b)
		{
			$object[$b] = boolval(!empty($object[$b]));
		}
		return $object;
	}

	/**
	 * Set configuration data for service.
	 *
	 * @param $data array configuration data
	 */
	function set($object)
	{

		// Validation
		$this->_validate(__METHOD__, func_get_args());

		// Modify bools
		foreach (array("enable", "enablessl", "ExecCGI", "Indexes", "FollowSymLinks", "SymLinksIfOwnerMatch", "Includes", "MultiViews", "AuthConfig", "OverrideIndexes", "Limit", "Options")
						 as $b)
		{
			$object[$b] = boolval(!empty($object[$b]));
		}

		// Check for port conflicts
		if ($object['enable'] && $object['vhosttype'] == 'port')
		{

			$webconf = $this->configGet("//webadmin");
			$ports   = array();

			if (empty($webconf['forcesslonly']))
			{
				$ports[] = $webconf['port'];
			}
			if (!empty($webconf['enablessl']))
			{
				$ports[] = $webconf['sslport'];
			}

			foreach ($ports as $p)
			{
				if (intval($p) == intval($object['port']))
				{
					throw new Exception("Port conflict: port {$object['port']} is already in use by OpenMediaVault's web GUI.");
				}
			}

		}

		// Set configuration object
		$this->configReplace(self::xpathRoot, $object);

		$this->configSave();

		// Test new configuration
		if ($object['enable'])
		{

			$cmd = "sudo omv-mkconf website configtest 2>&1";
			OMVUtil::exec($cmd, $output, $result);
			if ($result !== 0)
			{

				// Disable site and rewrite config
				$this->configReplace(self::xpathRoot . '/enable', '0');
				$this->configSave();
				exec("sudo a2dissite zzz-omv-website-vhost 2>&1");
				exec("sudo omv-mkconf apache2");

				// Return error object rather than throwing an exception
				return array(
					'configfail'=> true,
					'message'   => implode("\n", $output)
				);

			}

		}

		// Notify general configuration changes
		$dispatcher = &OMVNotifyDispatcher::getInstance();
		$dispatcher->notify(OMV_NOTIFY_MODIFY,
												"org.openmediavault.webadmin", $this->configGet("//webadmin"));

	}

	/**
	 * Return php.ini text
	 */
	function getPhpIni()
	{

		$this->_validate();

		// Cat file
		$cmd = "sudo cat /var/www/omv-website-vhost/php.ini 2>&1";
		OMVUtil::exec($cmd, $output, $result);
		if ($result !== 0)
		{
			throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));
		}

		return array('phpini'=> implode("\n", $output));

	}

	/**
	 * Set php.ini text
	 */
	function setPhpIni($data)
	{

		$this->_validate(__METHOD__, func_get_args());

		// Create temp file
		$pin = tempnam("/tmp", '_pin');
		file_put_contents($pin, $data['phpini']);

		// Copy file
		$cmd = "sudo cp {$pin} /var/www/omv-website-vhost/php.ini 2>&1";
		OMVUtil::exec($cmd, $output, $result);
		unlink($pin);
		if ($result !== 0)
		{
			throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));
		}

		exec("sudo /etc/init.d/apache2 graceful");

	}

}
