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
require_once("openmediavault/module.inc");
require_once("openmediavault/config.inc");
require_once("openmediavault/error.inc");
require_once("openmediavault/util.inc");
require_once("openmediavault/initscript.inc");
require_once("openmediavault/log.inc");

class WebsiteModule extends OMVModuleAbstract implements OMVINotifyListener {

	/**
	 * Get the module name.
	 */
	public static function getName()
	{
		return "website";
	}

	/**
	 * Update the service.
	 */
	public function updateService()
	{

		global $xmlConfig;

		// Get the configuration object
		$xpath  = "//services/website";
		$object = $xmlConfig->get($xpath);

		if (is_null($object))
		{
			throw new OMVException(OMVErrorMsg::E_CONFIG_GET_OBJECT_FAILED, $xpath);
		}

		// Create apache website file
		$cmd = "sudo omv-mkconf website 2>&1";
		OMVUtil::exec($cmd, $output, $result);
		if ($result !== 0)
		{
			throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));
		}

		// Check that this configuration doesn't break anything
		$cmd = "sudo apache2ctl configtest";
		OMVUtil::exec($cmd, $output, $result);
		if ($result !== 0)
		{

			// Failed. Disable site
			$object['enable'] = false;
			$xmlConfig->replace("//services/website", $object);
			$xmlConfig->save();
			exec("sudo a2dissite zzz-omv-website-vhost");
			exec("sudo omv-mkconf apache2");

			throw new OMVException(OMVErrorMsg::E_EXEC_FAILED, $cmd, implode("\n", $output));

		}

		// Force Apache to reload its configuration.
		$initd = new OMVSysVInitScript("apache2", TRUE);
		$initd->invoke("graceful");

	}

	/**
	 * Bind listeners.
	 */
	function bindListeners(OMVNotifyDispatcher $dispatcher)
	{

		$dispatcher->addListener(
			OMV_NOTIFY_MODIFY,
			"org.openmediavault.webadmin",
			array($this, "updateService"), 9000); // must run after apache.inc

	}

}

// Register module
$moduleMgr = &OMVModuleMgr::getInstance();
$moduleMgr->registerModule(new WebsiteModule());

// Register new logfile type
OMVLogFile::registerType("websiteaccess", array(
																							 "filename" => "website_access.log",
																							 "filepath" => "/var/log/apache2/omv-website-vhost_access.log",
																							 "regex"    => "/^(.*?)\s+[^\s]+\s+(.*?)\s+\[(.+?)\s+.*?\]\s+(.*)$/",
																							 "columns"  => array(
																								 "host"  => 1,
																								 "user"  => 2,
																								 "date"  => array(
																									 "index" => 3,
																									 "func"  => create_function('$v', 'return strpdate($v,"j/M/Y:G:i:s");')
																								 ),
																								 "event" => 4
																							 )
																					));

// Register new logfile type
OMVLogFile::registerType("websiteerror", array(
																							"filename" => "website_error.log",
																							"filepath" => "/var/log/apache2/omv-website-vhost_error.log",
																							"regex"    => "/^\[.*?\s+(.*?)\]\s+\[(.*?)\]\s+(.*?)$/",
																							"columns"  => array(
																								"date"     => array(
																									"index" => 1,
																									"func"  => create_function('$v', 'return strpdate($v,"M j G:i:s Y");')
																								),
																								"severity" => 2,
																								"event"    => 3
																							)
																				 ));

