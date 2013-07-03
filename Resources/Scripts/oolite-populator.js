/*

oolite-populator.js

Built-in system populator settings


Oolite
Copyright © 2004-2013 Giles C Williams and contributors

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
MA 02110-1301, USA.

*/


/*jslint white: true, undef: true, eqeqeq: true, bitwise: true, regexp: true, newcap: true, immed: true */
/*global missionVariables, player*/


"use strict";


this.name			= "oolite-populator";
this.author			= "cim";
this.copyright		= "© 2008-2013 the Oolite team.";
this.version		= "1.79";

/* TO-DO:
 * Buoys need to be given spin (0.15 pitch, 0.1 roll)
 * Thargoid chance should be lower for non-human systems
 * Nova mission/system needs modifying
 */
this.systemWillPopulate = function() 
{
		log(this.name,"System populator");

		/* Priority range 0-99 used by Oolite default populator */

		/* Add navigation buoys */
		// for the compass to work properly, the buoys need to be added first,
		// in this order.
		system.setPopulator("oolite-nav-buoy",
												{
														priority: 1,
														location: "COORDINATES",
														coordinates: system.mainStation.position.add(system.mainStation.vectorForward.multiply(10E3)),
														callback: function(pos) {
																var nb = system.addShips("buoy",1,pos,0)[0];
																nb.scanClass = "CLASS_BUOY";
														},
														deterministic: true
												});

		system.setPopulator("oolite-witch-buoy",
												{
														priority: 2,
														location: "COORDINATES",
														coordinates: [0,0,0],
														callback: function(pos) {
																var wb = system.addShips("buoy-witchpoint",1,pos,0)[0];
																wb.scanClass = "CLASS_BUOY";
														},
														deterministic: true
												});
		
		/* Calculate numbers of major groups */
		var gov = system.info.government; // 0=anarchy, 7=corporate
		var eco = system.info.economy; // 0=rich ind, 7=poor ag
		/* Calculate traders */
		var traders = 9 - eco;
		if (gov == 0) 
		{
				traders *= 1.25;
		}
		// randomise with centred distribution
		traders = 1 + traders * (Math.random() + Math.random());
		// trim if too many
		while (traders > 15)
		{
				traders = 1+(Math.random()*traders);
		}
		traders = Math.floor(traders);

		var pstraders = Math.floor((Math.random()*4) + (traders * (Math.random()*32) / 120));
		
		/* Calculate pirates */
		// more in more dangerous systems, more if more traders about
		var pirates = ((traders/3)+Math.random()+Math.random())*(8-gov);
		// randomise with centred distribution
		pirates = 1 + pirates * (Math.random() + Math.random());
		// trim if too many
		while (pirates > 25)
		{
				pirates = 12+(Math.random()*pirates);
		}
		
		var pspirates = pirates * Math.random()*32/120;
		/* old populator allocated these pirates individually to various
		 * packs.  this populator doesn't make it easy to do this the same
		 * way so instead, divide the number of pirates by the expected
		 * pack size to get the number of packs */
		pirates = Math.floor(pirates/2.5);
		pspirates = Math.floor(pspirates/2.5);

		/* Calculate bounty hunters */
		var hunters = (1+gov)*(traders/8);
		// more in anarchy
		if (gov==0)
		{
				hunters *= 1.25;
		}
		// randomise with centred distribution
		hunters = 1 + hunters * (Math.random() + Math.random());
		// trim if too many
		while (hunters > 15)
		{
				hunters = 5+(Math.random()*hunters);
		}
		hunters = Math.ceil(hunters);
		var pshunters = Math.floor(hunters * Math.random()*32/160);
		
		if (hunters+pirates+traders < 10) 
		{
				// too quiet
				hunters += 2;
				pirates += 1;
				traders += 2;
		}
		
		/* Calculate thargoids */
		var thargoids = 0;
		while (Math.random() < 0.1)
		{
				thargoids++;
		}
		
		/* Start adding ship groups */
		log(this.name,"Adding Traders: "+traders+" to route 1, "+pstraders+" to route 2");
		log(this.name,"Adding Pirate packs: "+pirates+" to route 1, "+pspirates+" to route 2");
		log(this.name,"Adding Hunters: "+hunters+" to route 1, "+pshunters+" to route 2");
		log(this.name,"Adding Thargoids: "+thargoids+" to route 1");

		/* Add traders */
		system.setPopulator("oolite-route1-traders",
												{
														priority: 10,
														location: "LANE_WP",
														groupCount: traders,
														callback: function(pos) {
																var r1t = system.addShips("trader",1,pos,0)[0];
																r1t.setBounty(0,"setup actions");
														}
												});

		system.setPopulator("oolite-route2-traders",
												{
														priority: 10,
														location: "LANE_PS",
														groupCount: pstraders,
														callback: function(pos) {
																var r2t = system.addShips("trader",1,pos,0)[0];
																r2t.setBounty(0,"setup actions");
																// ensure sufficient insulation
																// tested at Aenqute - see [Universe makeSunSkimmer]
																var reqInsulation = 1000/(1+r2t.maxSpeed);
																if (reqInsulation > 12)
																{
																		reqInsulation = 12;
																		// 12 is enough to survive indefinitely
																		// anywhere in non-nova systems
																}
																if (r2t.heatInsulation < reqInsulation)
																{
																		r2t.heatInsulation = reqInsulation;
																}
																r2t.switchAI("route2sunskimAI.plist");
														}
												});
		
		/* Add pirates */
		var addPirates = function(pos) 
		{
				var size = Math.random()*4;
				if (system.government >= 6)
				{
						size = size/2;
				}
				else if (system.government <= 1)
				{
						size += Math.random()*3;
				}
				size = Math.ceil(size);
				log("oolite-populator","Pirate pack, size: "+size);
				var pg = system.addGroup("pirate",size,pos,2.5E3);
				for (var i=0;i<pg.ships.length;i++)
				{
						pg.ships[i].setBounty(20+system.government+size+Math.floor(Math.random()*8),"setup actions");
				}
		};

		system.setPopulator("oolite-route1-pirates",
												{
														priority: 10,
														location: "LANE_WP",
														groupCount: pirates,
														callback: addPirates
												});

		system.setPopulator("oolite-route2-pirates",
												{
														priority: 10,
														location: "LANE_PS",
														groupCount: pspirates,
														callback: addPirates
												});

		/* Add hunters */
		var addHunter = function(pos) 
		{
				if (Math.random()*8 < system.government)
				{
						// add police
						if (Math.random()*8 < system.techLevel - 6)
						{
								var hunter = system.addShips("interceptor",1,pos,0)[0];
								hunter.primaryRole = "police";
						}
						else
						{
								var hunter = system.addShips("police",1,pos,0)[0];
						}								
				}
				else
				{
						var hunter = system.addShips("hunter",1,pos,0)[0];
				}
				hunter.setBounty(0,"setup actions");
				return hunter;
		}
		system.setPopulator("oolite-route1-hunters",
												{
														priority: 10,
														location: "LANE_WP",
														groupCount: hunters,
														callback: addHunter
												});

		system.setPopulator("oolite-route2-hunters",
												{
														priority: 10,
														location: "LANE_PS",
														groupCount: hunters,
														callback: function(pos) {
																var hunter = addHunter(pos);
																hunter.switchAI("route2patrolAI.plist");
																hunter.AIState = (Math.random()<0.5)?"HEAD_FOR_PLANET":"HEAD_FOR_SUN";
														}
												});
		
		/* Add thargoids */
		system.setPopulator("oolite-route1-thargoids",
												{
														priority: 10,
														location: "LANE_WP",
														groupCount: thargoids,
														callback: function(pos) {
																system.addShips("thargoid",1,pos,0);
														}
												});
		
		/* Add asteroids */
		var clusters = 2*(1+Math.floor(system.scrambledPseudoRandomNumber(51728)*4));
		var psclusters = 1+(clusters/2);
		clusters = clusters-psclusters;
		
		var addRockCluster = function(pos) 
		{
				var size = 1+Math.floor(system.scrambledPseudoRandomNumber(Math.floor(pos.x))*11);
				var hermit = (system.scrambledPseudoRandomNumber(Math.floor(pos.y))*31) <= size;
				var rocks = system.addShips("asteroid",size,pos,25E3);
				if (hermit) 
				{
						var rh = system.addShips("rockhermit",1,pos,0)[0];
						rh.scanClass = "CLASS_ROCK";
				}
				log("oolite-populator","Added "+size+" rocks and "+hermit+" hermit at "+pos);
		}

		system.setPopulator("oolite-route1-asteroids",
												{
														priority: 10,
														location: "LANE_WP",
														locationSeed: 51728,
														groupCount: clusters,
														callback: addRockCluster,
														deterministic: true
												});
		system.setPopulator("oolite-route2-asteroids",
												{
														priority: 10,
														location: "LANE_PS",
														locationSeed: 82715,
														groupCount: psclusters,
														callback: addRockCluster,
														deterministic: true
												});
		/* To ensure there's at least one hermit, for pirates to dock at */
		system.setPopulator("oolite-offlane-hermit",
												{
														priority: 99, // make sure all other core population is done
														location: "PLANET_ORBIT_HIGH",
														locationSeed: 71258,
														groupCount: 1,
														callback: function(pos) {
																if (system.countShipsWithPrimaryRole("rockhermit")==0) {
																		var rh = system.addShips("rockhermit",1,pos,0)[0];
																		rh.scanClass = "CLASS_ROCK";
																		log("oolite-populator","Added offlane hermit at "+pos);
																		
																		// just the hermit, no other rocks
																}
														},
														deterministic: true
												});

}

this.interstellarSpaceWillPopulate = function() 
{
		log(this.name,"Interstellar populator");
		system.setPopulator("oolite-interstellar-thargoids",
												{
														priority: 10,
														location: "WITCHPOINT",
														groupCount: 2+Math.floor(Math.random()*4),
														callback: function(pos) {
																system.addShips("thargoid",1,pos,0);
														}
												});
}